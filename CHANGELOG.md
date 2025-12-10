# Changelog

All notable changes to the **Save as JPG** Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2025-12-10

### Fixed
- **Memory leak**: ImageBitmap now always closed via `try/finally` in OffscreenCanvas conversion
- **Race condition**: Added mutex to prevent duplicate offscreen document creation during concurrent conversions
- **Memory efficiency**: Replaced data URLs with Object URLs for downloads, reducing memory pressure on large images
- **Canvas context**: Added null checks after `getContext('2d')` to prevent silent failures
- **Image cleanup**: Proper cleanup of image elements in offscreen document to help garbage collection
- **Fetch timeout**: Added 30-second timeout to prevent hanging on slow/unresponsive image requests

### Added
- **Error notifications**: Users now see notification popups when image conversion fails
- **3-digit hex color support**: Color input now accepts shorthand `#RGB` format in addition to `#RRGGBB`
- **Missing i18n keys**: Added `optionsSubtitle`, `qualityHintMain`, `qualityRecommendation`, `footerPrivacy`
- **`.gitattributes`**: Added for consistent line ending normalization across platforms

### Changed
- Added `notifications` permission to manifest for error feedback

## [2.0.0] - 2025-12-09

### Added
- Complete rewrite with **Manifest V3** architecture
- Modern options page with **dark/light theme toggle**
- **SVG upscaling** — Automatically scales small SVGs to 2048px for crisp JPEG output
- **High-res image detection** — Extracts best quality from `srcset` and lazy-loaded images
- **Smart filename preservation** — Maintains original filename with `.jpg` extension
- **Configurable background color** for transparent images (PNG, GIF, WebP, SVG)
- **Offline capable** — Works without internet connection
- Privacy-focused design with 100% local processing

### Changed
- Migrated from Manifest V2 to **Manifest V3**
- Replaced background page with **Service Worker**
- Uses **OffscreenCanvas** for efficient image conversion
- Falls back to **Offscreen Document** when OffscreenCanvas unavailable

### Removed
- Deprecated Manifest V2 APIs
- External dependencies (now zero dependencies)

## [1.0.0] - Initial Release

### Added
- Right-click context menu "Save as JPG"
- Basic image-to-JPEG conversion
- Configurable JPEG quality setting
- Support for common image formats (PNG, WebP, GIF)

---

[2.0.1]: https://github.com/GosuDRM/Save-as-JPG/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/GosuDRM/Save-as-JPG/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/GosuDRM/Save-as-JPG/releases/tag/v1.0.0
