/**
 * @fileoverview Options Page Controller for Save as JPG Chrome Extension
 * Manages user preferences: JPEG quality, background color, and download behavior.
 * @author GosuDRM
 * @license MIT
 */

'use strict';

/**
 * @const {Object} DEFAULT_SETTINGS
 * Default extension settings (maximum quality, white background, direct download)
 */
const DEFAULT_SETTINGS = {
  quality: 1.0,
  bgColor: '#ffffff',
  saveAs: false
};

/* -------------------------------------------------------------------------- */
/*                               DOM References                               */
/* -------------------------------------------------------------------------- */

let form, qualityInput, qualityValue, bgColorInput, bgColorPicker;
let saveAsInput, saveBtn, resetBtn, statusDiv;

/* -------------------------------------------------------------------------- */
/*                              Initialization                                */
/* -------------------------------------------------------------------------- */

/**
 * Initializes the options page on DOM ready.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM references after document is ready
  form = document.getElementById('optionsForm');
  qualityInput = document.getElementById('quality');
  qualityValue = document.getElementById('qualityValue');
  bgColorInput = document.getElementById('bgColor');
  bgColorPicker = document.getElementById('bgColorPicker');
  saveAsInput = document.getElementById('saveAs');
  saveBtn = document.getElementById('saveBtn');
  resetBtn = document.getElementById('resetBtn');
  statusDiv = document.getElementById('status');

  loadSettings();
  applyI18n();
  attachEventListeners();
  initTheme();
});

/* -------------------------------------------------------------------------- */
/*                              Theme Management                              */
/* -------------------------------------------------------------------------- */

/**
 * Initializes theme toggle functionality.
 * Respects saved preference, falls back to system preference.
 */
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');

  // Restore saved theme or detect system preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // Handle theme toggle clicks
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

/* -------------------------------------------------------------------------- */
/*                             Settings Management                            */
/* -------------------------------------------------------------------------- */

/**
 * Loads user settings from Chrome sync storage and populates form fields.
 */
async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  qualityInput.value = settings.quality;
  qualityValue.textContent = Math.round(settings.quality * 100) + '%';

  bgColorInput.value = settings.bgColor;
  bgColorPicker.value = settings.bgColor;

  saveAsInput.checked = settings.saveAs;
}

/**
 * Attaches event listeners to form controls.
 */
function attachEventListeners() {
  // Update percentage display on slider change
  qualityInput.addEventListener('input', (e) => {
    const percent = Math.round(parseFloat(e.target.value) * 100);
    qualityValue.textContent = percent + '%';
  });

  // Synchronize text input with color picker
  bgColorInput.addEventListener('input', (e) => {
    const color = e.target.value.trim();
    if (isValidHexColor(color)) {
      bgColorPicker.value = color;
    }
  });

  bgColorPicker.addEventListener('input', (e) => {
    bgColorInput.value = e.target.value;
  });

  // Form submission handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });

  // Reset to defaults handler
  resetBtn.addEventListener('click', () => {
    resetToDefaults();
  });
}

/**
 * Validates and saves current settings to Chrome sync storage.
 */
async function saveSettings() {
  const bgColor = bgColorInput.value.trim().toLowerCase();

  // Validate hex color format
  if (!isValidHexColor(bgColor)) {
    showStatus('Invalid HEX color format. Use #RRGGBB (e.g., #ffffff)', 'error');
    return;
  }

  const settings = {
    quality: parseFloat(qualityInput.value),
    bgColor: bgColor,
    saveAs: saveAsInput.checked
  };

  try {
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

/**
 * Resets all settings to default values and persists to storage.
 */
async function resetToDefaults() {
  qualityInput.value = DEFAULT_SETTINGS.quality;
  qualityValue.textContent = '100%';

  bgColorInput.value = DEFAULT_SETTINGS.bgColor;
  bgColorPicker.value = DEFAULT_SETTINGS.bgColor;

  saveAsInput.checked = DEFAULT_SETTINGS.saveAs;

  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  showStatus('Settings restored to defaults!', 'success');
}

/* -------------------------------------------------------------------------- */
/*                              Utility Functions                             */
/* -------------------------------------------------------------------------- */

/**
 * Validates a string as a valid hex color code.
 * Supports both 3-digit (#RGB) and 6-digit (#RRGGBB) formats.
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color
 */
function isValidHexColor(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/** @type {number|null} Timeout ID for status auto-hide */
let statusTimeoutId = null;

/**
 * Displays a status message with auto-dismiss after 3 seconds.
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
function showStatus(message, type) {
  // Clear any existing timeout to prevent stacking
  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
    statusTimeoutId = null;
  }

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  statusTimeoutId = setTimeout(() => {
    statusDiv.classList.add('hidden');
    statusTimeoutId = null;
  }, 3000);
}

/**
 * Applies internationalization to elements with data-i18n attribute.
 * Replaces text content with localized messages from _locales.
 */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = message;
      } else {
        element.textContent = message;
      }
    }
  });
}