# MediaDrop (media-to-mp3)

> A polished, minimal, and privacy-first web application for media analysis and client-side MP3 audio conversion.

[![CI & Health Check](https://github.com/HenryParker37-VIP/media-to-mp3/actions/workflows/ci.yml/badge.svg)](https://github.com/HenryParker37-VIP/media-to-mp3/actions)
[![Netlify Status](https://api.netlify.com/api/v1/badges/media-to-mp3/deploy-status)](https://media-to-mp3.netlify.app)

---

## Overview

MediaDrop is designed around a clean, uncluttered workflow:
1. **Paste URL** or **Drop Media File**
2. **Detect Media & Metadata** (with official YouTube oEmbed details or file format introspection)
3. **Select Audio Quality** (High 320 kbps, Standard 192 kbps, Small 128 kbps)
4. **Convert & Download** directly in your browser with authentic, non-fabricated progress updates and a smooth completion animation.

---

## Important Legal & Platform Constraints

* **No Access Control Bypasses**: This application explicitly does **not** bypass YouTube access controls, DRM, signature encryption, bot-detection, rate limits, or authentication barriers. It does not act as a generic copyright-circumvention YouTube ripping service.
* **Compliant YouTube Integration**: YouTube URLs are strictly used for metadata validation, video title retrieval, channel attribution, thumbnail rendering, and canonical source preview using YouTube's official public oEmbed API.
* **Authorized & Local Media Processing**: Actual conversion to MP3 is provided for:
  1. User-uploaded audio and video files (`.mp4`, `.mov`, `.webm`, `.m4a`, `.wav`, `.mp3`).
  2. Direct authorized downloadable media streams where permissions exist.
  3. Content owned or authorized by the user.
* **Honest Stream Restriction Handling**: If an entered YouTube link cannot legally or technically provide an authorized stream, MediaDrop clearly displays:
  > *"This source does not provide an authorized downloadable media stream. You can upload the original file to convert it to MP3."*
  and provides an immediate action button to switch to user-uploaded file processing.

---

## Architecture

MediaDrop uses a modular architecture isolating external providers and client-side processing:

```
[ User Browser / Device ]
       │
       ├───> Input: Paste URL or Drag & Drop File
       │
       ├───> URL Analyzer (`/api/analyze`)
       │        └── Provider Registry (`lib/providers/`)
       │               ├── YouTube Provider (Official oEmbed API)
       │               └── Direct Media Provider (SSRF-Guarded Header Inspector)
       │
       └───> Client-Side Conversion Engine (`lib/conversion/`)
                ├── Capability Detector (`HTMLMediaElement.canPlayType`)
                ├── Web Audio API Decoder (`AudioContext.decodeAudioData`)
                ├── Web Worker MP3 Encoder (`@breezystack/lamejs`)
                └── Universal Browser Downloader (iOS Safari & Desktop compatible)
```

### Key Technical Advantages
* **100% Private**: User media files are decoded and encoded completely inside the client's browser. Files never leave the user's device.
* **Lightweight**: Pure JavaScript/WASM worker implementation (~119 kB initial JS bundle) without the heavy 35MB+ overhead of multi-threaded FFmpeg.
* **Cross-Origin Safe**: Avoids `Cross-Origin-Embedder-Policy` conflicts, ensuring remote YouTube thumbnails render without failure.
* **Authentic Progress Reporting**: Uses honest indeterminate wave states during unpredictable decoding operations, and exact frame-measured percentages (`0%` to `100%`) during Web Worker PCM encoding.

---

## Browser Media Capabilities & Platform Honesty

Because browser media engines vary by operating system and vendor:
* **Desktop Chrome / Firefox / Edge**: Full native support for MP4, WebM (Opus/Vorbis), WAV, MP3, and M4A.
* **macOS Safari / iOS Safari**: Full native support for MP4 (AAC audio), MOV (AAC/PCM), M4A, WAV, and MP3. Safari has limited or no native support for WebM (Opus/Vorbis) containers; MediaDrop detects this at runtime and guides the user to upload MP4, MOV, or WAV files.

---

## Development Instructions

### Prerequisites
* Node.js 18+ (tested on Node 20 and Node 24)
* npm 9+

### Setup
```bash
# Clone the repository
git clone https://github.com/HenryParker37-VIP/media-to-mp3.git
cd media-to-mp3

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality Assurance & Validation Commands
```bash
# Run ESLint
npm run lint

# Run TypeScript typecheck
npm run typecheck

# Run unit tests
npm test

# Build production bundle
npm run build
```

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development:
```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | No | Display name of the application (defaults to `MediaDrop`) |
| `YOUTUBE_API_KEY` | No | Optional YouTube Data API v3 key (public oEmbed works out of the box without any key) |

---

## Deployment Instructions

### Deploying to Netlify
1. Connect the GitHub repository `HenryParker37-VIP/media-to-mp3` in the Netlify Dashboard.
2. Build Settings:
   * **Build Command**: `npm run build`
   * **Publish Directory**: `.next`
   * **Plugins**: `@netlify/plugin-nextjs` (configured in `netlify.toml`)
3. Every push to `main` automatically builds, tests, and deploys the application.

---

## Platform Limitations

1. **YouTube Audio Extraction**: In accordance with YouTube's Terms of Service and platform restrictions, MediaDrop does not rip copyrighted audio from YouTube video streams. YouTube links display official metadata, thumbnails, and author links, while conversions are performed on user-uploaded or authorized media files.
2. **Safari WebM Codecs**: WebM files encoded with Vorbis or Opus audio tracks cannot be decoded natively by WebKit (Safari on macOS and iOS). Users on Safari are notified to provide MP4, MOV, or WAV files instead.
3. **Browser Memory**: Extremely large video files (>500MB) may exceed browser tab memory limits during in-memory `AudioBuffer` allocation.
