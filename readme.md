# Save as JPG

> Convert any web image to high-quality JPEG with a single right-click.

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![Save as JPG Demo](icons/128.png)

## ✨ Features

- **One-click conversion** — Right-click any image → "Save as JPG"
- **Maximum quality** — Default 100% JPEG quality (visually lossless)
- **Universal format support** — PNG, WebP, AVIF, GIF, SVG, HEIC, and more
- **Smart filename preservation** — `photo.webp` → `photo.jpg`
- **Transparent image handling** — Configurable background color (default: white)
- **SVG upscaling** — Automatically scales small SVGs to 2048px for crisp output
- **High-res detection** — Extracts best quality from srcset and lazy-loaded images
- **100% local processing** — Nothing ever leaves your device
- **Offline capable** — Works without internet connection
- **Dark mode** — Beautiful options page with light/dark theme toggle

## 📦 Installation

### Chrome Web Store (Recommended)
*Coming soon*

### Manual Installation (Developer Mode)

1. **Download** this repository
   ```bash
   git clone https://github.com/GosuDRM/Save-as-JPG.git
   ```
   Or download as ZIP and extract

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the `save-image-as-jpg` folder

4. **Done!** Right-click any image to save as JPG

## ⚙️ Configuration

Access settings via:
- Right-click extension icon → **Options**
- Or navigate to `chrome://extensions` → Save as JPG → **Details** → **Extension options**

| Setting | Default | Description |
|---------|---------|-------------|
| **JPEG Quality** | 100% | Range: 70–100%. Higher = better quality, larger file |
| **Background Color** | `#ffffff` | Fill color for transparent images (PNG, GIF, WebP) |
| **Save As Dialog** | Off | Show file picker on every download |

## 🔧 Technical Details

### Supported Formats
| Input Format | Output | Notes |
|--------------|--------|-------|
| PNG | JPEG | Transparency filled with background color |
| WebP | JPEG | Full support including animated (first frame) |
| AVIF | JPEG | Browser-dependent support |
| GIF | JPEG | First frame only |
| SVG | JPEG | Auto-upscaled if dimensions < 1024px |
| HEIC | JPEG | Requires browser support |
| BMP, TIFF | JPEG | Full support |

### Architecture
- **Manifest V3** compliant
- **Service Worker** based (no persistent background page)
- **OffscreenCanvas** for efficient conversion
- **Offscreen Document** fallback for edge cases
- **Zero external dependencies**

### Permissions Explained
| Permission | Reason |
|------------|--------|
| `contextMenus` | Add "Save as JPG" to right-click menu |
| `downloads` | Save converted images to disk |
| `storage` | Persist user settings |
| `activeTab` | Access clicked image on current page |
| `<all_urls>` | Fetch images from any website |

## 🛡️ Privacy

- **No data collection** — Zero analytics, tracking, or telemetry
- **No external requests** — All conversion happens locally in your browser
- **No account required** — Works immediately after installation
- **Open source** — Fully auditable codebase

## 📁 Project Structure

```
Save-as-JPG/
├── manifest.json       # Extension configuration
├── sw.js               # Service worker (background)
├── content.js          # Content script (image detection)
├── offscreen.html/js   # Fallback canvas conversion
├── options.html/js     # Settings page
├── styles/
│   └── options.css     # Options page styles
├── icons/              # Extension icons
└── _locales/           # Internationalization
    └── en/messages.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### v2.0.0
- Complete rewrite with Manifest V3
- New modern options page with dark mode
- Improved srcset and lazy-load detection
- SVG upscaling for small icons
- Better filename preservation
- Memory leak fixes and performance improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**GosuDRM**
- GitHub: [@GosuDRM](https://github.com/GosuDRM)
- Repository: [Save-as-JPG](https://github.com/GosuDRM/Save-as-JPG)

---

<p align="center">
  Made with ❤️ for the web
  <br>
  <sub>All image conversion happens 100% locally on your device</sub>
</p>