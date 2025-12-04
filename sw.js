/**
 * @fileoverview Service Worker for Save as JPG Chrome Extension
 * Handles context menu creation, image fetching, conversion, and download.
 * @author GosuDRM
 * @license MIT
 */

'use strict';

/** @const {string} Unique identifier for the context menu item */
const MENU_ID = 'save-image-as-jpg';

/** @const {Object} Default extension settings */
const DEFAULT_SETTINGS = {
  quality: 1.0,
  bgColor: '#ffffff',
  saveAs: false
};

/**
 * Creates the context menu item when the extension is installed or updated.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: chrome.i18n.getMessage('menuTitle') || 'Save image as JPG',
    contexts: ['image']
  });
});

/**
 * Handles context menu click events.
 * Attempts to get the highest resolution image URL from content script,
 * falls back to srcUrl if content script is unavailable.
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  try {
    const settings = await getSettings();
    let imageUrl = info.srcUrl;
    let dimensions = null;

    // Attempt to retrieve high-resolution URL from content script
    // Skip if tab.id is invalid (e.g., chrome://, edge://, file:// pages)
    if (tab?.id && tab.id !== chrome.tabs.TAB_ID_NONE) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_IMAGE_URL',
          fallbackUrl: info.srcUrl
        });

        if (response?.found) {
          imageUrl = response.url;
          dimensions = response.dimensions;
        }
      } catch (e) {
        // Content script not available (restricted page or not yet injected)
        console.warn('[Save as JPG] Content script unavailable, using context menu URL');
      }
    }

    await convertAndDownload(imageUrl, settings);
  } catch (error) {
    console.error('[Save as JPG] Conversion failed:', error);
  }
});

/**
 * Retrieves user settings from Chrome sync storage.
 * @returns {Promise<Object>} Settings object with quality, bgColor, and saveAs properties
 */
async function getSettings() {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    quality: result.quality ?? DEFAULT_SETTINGS.quality,
    bgColor: result.bgColor ?? DEFAULT_SETTINGS.bgColor,
    saveAs: result.saveAs ?? DEFAULT_SETTINGS.saveAs
  };
}

/**
 * Main conversion pipeline: fetch -> convert -> download.
 * @param {string} srcUrl - Source image URL
 * @param {Object} settings - User settings object
 */
async function convertAndDownload(srcUrl, settings) {
  const blob = await fetchImage(srcUrl);
  const jpegBlob = await convertToJPEG(blob, settings);
  await downloadBlob(jpegBlob, settings.saveAs, srcUrl);
}

/**
 * Fetches an image from URL and returns it as a Blob.
 * @param {string} url - Image URL to fetch
 * @returns {Promise<Blob>} Image data as Blob
 * @throws {Error} If HTTP request fails
 */
async function fetchImage(url) {
  const response = await fetch(url, { referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.blob();
}

/**
 * Converts an image Blob to JPEG format.
 * Uses OffscreenCanvas when available, falls back to offscreen document.
 * @param {Blob} blob - Source image blob
 * @param {Object} settings - User settings (quality, bgColor)
 * @returns {Promise<Blob>} JPEG image as Blob
 */
async function convertToJPEG(blob, settings) {
  const mimeType = blob.type;
  const isJPEG = mimeType.startsWith('image/jpeg');
  const needsBackground = !isJPEG;

  // Prefer OffscreenCanvas for better performance in service workers
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      return await convertWithOffscreenCanvas(blob, settings, needsBackground, mimeType);
    } catch (e) {
      console.warn('[Save as JPG] OffscreenCanvas unavailable, using fallback:', e.message);
    }
  }

  return await convertWithOffscreenDocument(blob, settings, needsBackground);
}

/**
 * Converts image using OffscreenCanvas API (preferred method).
 * Handles SVG upscaling for small or zero-dimension vectors.
 * @param {Blob} blob - Source image blob
 * @param {Object} settings - User settings
 * @param {boolean} needsBackground - Whether to add solid background
 * @param {string} mimeType - Original image MIME type
 * @returns {Promise<Blob>} JPEG image as Blob
 */
async function convertWithOffscreenCanvas(blob, settings, needsBackground, mimeType) {
  const isSVG = mimeType === 'image/svg+xml';
  const bitmap = await createImageBitmap(blob);

  let width = bitmap.width;
  let height = bitmap.height;

  // SVG images often have small or zero intrinsic dimensions; upscale to 2048px
  if (isSVG && Math.max(width, height) < 1024) {
    const target = 2048;
    const aspect = width && height ? width / height : 1;
    const longer = Math.max(width, height) || 1;
    const scale = target / longer;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Apply background color for transparent images (PNG, GIF, WebP, SVG)
  if (needsBackground) {
    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return await canvas.convertToBlob({ type: 'image/jpeg', quality: settings.quality });
}

/**
 * Fallback conversion using offscreen document with DOM canvas.
 * Used when OffscreenCanvas is unavailable or fails.
 * @param {Blob} blob - Source image blob
 * @param {Object} settings - User settings
 * @param {boolean} needsBackground - Whether to add solid background
 * @returns {Promise<Blob>} JPEG image as Blob
 */
async function convertWithOffscreenDocument(blob, settings, needsBackground) {
  // Create offscreen document if not already present
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  const documentCreated = contexts.length === 0;
  
  if (documentCreated) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'],
      justification: 'Canvas-based JPEG conversion fallback'
    });
  }

  try {
    const dataUrl = await blobToDataURL(blob);
    const response = await chrome.runtime.sendMessage({
      type: 'CONVERT_TO_JPEG',
      dataUrl,
      settings,
      needsBackground
    });

    if (response.error) throw new Error(response.error);
    return await dataURLToBlob(response.dataUrl);
  } finally {
    // Clean up offscreen document to prevent memory leaks
    if (documentCreated) {
      try {
        await chrome.offscreen.closeDocument();
      } catch (e) {
        // Document may already be closed, ignore
      }
    }
  }
}

/**
 * Initiates download of the converted JPEG image.
 * @param {Blob} blob - JPEG image blob to download
 * @param {boolean} saveAs - Whether to show "Save As" dialog
 * @param {string} srcUrl - Original image URL (used for filename)
 */
async function downloadBlob(blob, saveAs, srcUrl) {
  const dataUrl = await blobToDataURL(blob);
  const filename = getSuggestedFilename(srcUrl) || getTimestampFilename();

  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs
  });
}

/**
 * Extracts a clean filename from the image URL.
 * Removes query strings, fragments, and invalid filesystem characters.
 * @param {string} url - Source image URL
 * @returns {string|null} Sanitized filename with .jpg extension, or null if extraction fails
 */
function getSuggestedFilename(url) {
  try {
    const parsed = new URL(url);
    let name = parsed.pathname.split('/').pop() || '';
    if (!name) return null;

    // Remove query params, fragments, and file extension
    name = decodeURIComponent(name.split('?')[0].split('#')[0]);
    const dot = name.lastIndexOf('.');
    if (dot > -1) name = name.substring(0, dot);

    // Sanitize invalid filesystem characters
    name = name.replace(/[\0\\/:*?"<>|]/g, '_').trim();
    if (!name) return null;
    if (name.length > 150) name = name.substring(0, 150);

    return name + '.jpg';
  } catch {
    return null;
  }
}

/**
 * Generates a timestamp-based filename as fallback.
 * Format: YYYYMMDD_HHMMSS.jpg
 * @returns {string} Timestamp filename
 */
function getTimestampFilename() {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  return `${ts}.jpg`;
}

/**
 * Converts a Blob to a data URL string.
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64-encoded data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a data URL back to a Blob.
 * @param {string} dataUrl - Base64-encoded data URL
 * @returns {Promise<Blob>} Decoded Blob
 */
async function dataURLToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}