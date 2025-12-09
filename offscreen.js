/**
 * @fileoverview Offscreen Document for Save as JPG Chrome Extension
 * Provides DOM-based canvas conversion as fallback when OffscreenCanvas is unavailable.
 * This document runs in an isolated context with DOM access.
 * @author GosuDRM
 * @license MIT
 */

'use strict';

/**
 * Listens for conversion requests from the service worker.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONVERT_TO_JPEG') {
    handleConvertToJPEG(message, sendResponse);
    return true; // Required for async response
  }
});

/**
 * Handles the JPEG conversion request using DOM canvas.
 * Includes proper cleanup to prevent memory leaks with large images.
 * @param {Object} message - Message containing dataUrl, settings, and needsBackground
 * @param {Function} sendResponse - Callback to send response back to service worker
 */
async function handleConvertToJPEG(message, sendResponse) {
  let img = null;

  try {
    const { dataUrl, settings, needsBackground } = message;

    const isSVG = dataUrl.toLowerCase().includes('svg+xml');
    img = await loadImage(dataUrl);

    let width = img.naturalWidth || img.width || 0;
    let height = img.naturalHeight || img.height || 0;

    // SVG images often report small or zero dimensions; upscale to 2048px
    if (isSVG && Math.max(width, height) < 1024) {
      const target = 2048;
      const aspect = width > 0 && height > 0 ? width / height : 1;
      const longer = Math.max(width, height) || 1;

      const scale = target / longer;
      width = Math.round((width || target) * scale);
      height = Math.round((height || target / aspect) * scale);
    }

    // Fallback for edge cases with zero dimensions
    if (width === 0 || height === 0) {
      width = 2048;
      height = 2048;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Apply background color for transparent source images
    if (needsBackground) {
      ctx.fillStyle = settings.bgColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    const jpegDataUrl = canvas.toDataURL('image/jpeg', settings.quality ?? 0.92);
    sendResponse({ dataUrl: jpegDataUrl });
  } catch (error) {
    console.error('[Save as JPG] Canvas conversion failed:', error);
    sendResponse({ error: error.message });
  } finally {
    // Clean up image element to help garbage collector release memory
    if (img) {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    }
  }
}

/**
 * Loads an image from a data URL or source URL.
 * @param {string} src - Image source (data URL or URL)
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}