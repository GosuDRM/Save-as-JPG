/**
 * @fileoverview Content Script for Save as JPG Chrome Extension
 * Captures the highest-resolution image URL from right-clicked images.
 * Handles srcset parsing, lazy-loading attributes, and URL normalization.
 * @author GosuDRM
 * @license MIT
 */

'use strict';

/** @type {HTMLImageElement|null} Reference to the last right-clicked image element */
let lastClickedImage = null;

/**
 * Captures the image element on right-click (contextmenu event).
 * Uses capture phase to ensure we get the event before it bubbles.
 */
document.addEventListener('contextmenu', (event) => {
  const target = event.target;
  if (target.tagName === 'IMG') {
    lastClickedImage = target;
  } else {
    lastClickedImage = null;
  }
}, true);

/**
 * Listens for messages from the service worker.
 * Responds with the best available image URL and dimensions.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_IMAGE_URL') {
    if (lastClickedImage) {
      const imageUrl = getBestImageUrl(lastClickedImage);
      const dimensions = {
        naturalWidth: lastClickedImage.naturalWidth,
        naturalHeight: lastClickedImage.naturalHeight,
        displayWidth: lastClickedImage.width,
        displayHeight: lastClickedImage.height
      };
      // Clear reference to prevent stale data on next request
      lastClickedImage = null;
      sendResponse({ url: imageUrl, dimensions, found: true });
    } else {
      sendResponse({ url: message.fallbackUrl, found: false });
    }
    return true; // Required for async response
  }
});

/**
 * Determines the highest-resolution URL available for an image element.
 * Priority: srcset (highest width/density) > currentSrc > lazy-load attrs > src
 * @param {HTMLImageElement} img - Target image element
 * @returns {string} Best available image URL (absolute)
 */
function getBestImageUrl(img) {
  try {
    let bestUrl = null;

    // Priority 1: Parse srcset for highest resolution candidate
    if (img.srcset) {
      const candidates = parseSrcset(img.srcset);
      if (candidates.length > 0) {
        let maxW = 0, maxX = 0;
        let bestWUrl = null, bestXUrl = null;

        for (const c of candidates) {
          if (c.descriptor.endsWith('w')) {
            const w = parseInt(c.descriptor, 10) || 0;
            if (w > maxW) {
              maxW = w;
              bestWUrl = c.url;
            }
          } else if (c.descriptor.endsWith('x')) {
            const x = parseFloat(c.descriptor) || 1;
            if (x > maxX) {
              maxX = x;
              bestXUrl = c.url;
            }
          }
        }
        bestUrl = bestWUrl || bestXUrl || candidates[candidates.length - 1].url;
      }
    }

    // Priority 2: Browser's resolved currentSrc (may differ from src)
    if (!bestUrl && img.currentSrc && img.currentSrc !== img.src) {
      bestUrl = img.currentSrc;
    }

    // Priority 3: Common lazy-loading data attributes
    if (!bestUrl) {
      const lazyAttrs = [
        'data-original', 'data-src', 'data-original-src',
        'data-lazy-src', 'data-full-src', 'data-large-src',
        'data-orig-src', 'data-hi-res'
      ];
      for (const attr of lazyAttrs) {
        const url = img.getAttribute(attr);
        if (url && isValidUrl(url)) {
          bestUrl = url;
          break;
        }
      }
    }

    // Priority 4: Standard src attribute as fallback
    if (!bestUrl) bestUrl = img.src;

    return toAbsoluteURL(bestUrl);
  } catch (error) {
    console.error('[Save as JPG] Failed to resolve image URL:', error);
    return toAbsoluteURL(img.src);
  }
}

/**
 * Parses the srcset attribute into an array of URL/descriptor pairs.
 * @param {string} srcset - Raw srcset attribute value
 * @returns {Array<{url: string, descriptor: string}>} Parsed candidates
 */
function parseSrcset(srcset) {
  const candidates = [];
  const parts = srcset.split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const url = tokens[0];
    const descriptor = tokens[1] || '1x';
    if (url) candidates.push({ url, descriptor });
  }
  return candidates;
}

/**
 * Converts a relative or protocol-relative URL to an absolute URL.
 * @param {string} url - URL to normalize
 * @returns {string} Absolute URL
 */
function toAbsoluteURL(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('//')) return location.protocol + url;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, location.href).href;
  } catch {
    return url;
  }
}

/**
 * Validates whether a URL is likely a real image (not a placeholder).
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL appears to be a valid image source
 */
function isValidUrl(url) {
  if (!url) return false;
  // Filter out tiny inline SVG placeholders
  if (url.startsWith('data:image/svg') && url.length < 200) return false;
  // Filter out common placeholder patterns
  if (url.includes('placeholder') || url.includes('loading')) return false;
  return true;
}