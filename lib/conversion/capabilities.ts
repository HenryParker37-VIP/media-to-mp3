/**
 * Browser media capability detection and honest format verification.
 */

export interface BrowserCapabilities {
  isSafari: boolean;
  isIOS: boolean;
  hasAudioContext: boolean;
  hasWorker: boolean;
  supportedMimeTypes: Record<string, 'probably' | 'maybe' | 'unsupported'>;
  displayFormats: Array<{ ext: string; name: string; supported: boolean; note?: string }>;
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  if (typeof window === 'undefined') {
    return {
      isSafari: false,
      isIOS: false,
      hasAudioContext: false,
      hasWorker: false,
      supportedMimeTypes: {},
      displayFormats: [
        { ext: 'MP3', name: 'MP3 Audio', supported: true },
        { ext: 'WAV', name: 'WAV Audio', supported: true },
        { ext: 'M4A', name: 'M4A / AAC', supported: true },
        { ext: 'MP4', name: 'MP4 Video', supported: true },
        { ext: 'WEBM', name: 'WebM Audio/Video', supported: true },
        { ext: 'MOV', name: 'QuickTime MOV', supported: true },
      ],
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS =
    /ipad|iphone|ipod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isSafari =
    /safari/.test(userAgent) && !/chrome|chromium|edg|crios|fxios/.test(userAgent);

  const hasAudioContext =
    typeof window.AudioContext !== 'undefined' ||
    typeof (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext !==
      'undefined';
  const hasWorker = typeof window.Worker !== 'undefined';

  const dummyAudio = document.createElement('audio');
  const dummyVideo = document.createElement('video');

  const probe = (type: string, isVideo = false): 'probably' | 'maybe' | 'unsupported' => {
    const el = isVideo ? dummyVideo : dummyAudio;
    const res = el.canPlayType(type);
    if (res === 'probably') return 'probably';
    if (res === 'maybe') return 'maybe';
    return 'unsupported';
  };

  const mp3 = probe('audio/mpeg');
  const wav = probe('audio/wav; codecs="1"');
  const m4a = probe('audio/mp4; codecs="mp4a.40.2"');
  const mp4 = probe('video/mp4; codecs="avc1.42E01E, mp4a.40.2"', true);
  const webmOpus = probe('audio/webm; codecs="opus"');
  const webmVideo = probe('video/webm; codecs="vp8, opus"', true);
  const mov = probe('video/quicktime', true);

  const supportedMimeTypes = {
    'audio/mpeg': mp3,
    'audio/wav': wav,
    'audio/mp4': m4a,
    'video/mp4': mp4,
    'audio/webm': webmOpus,
    'video/webm': webmVideo,
    'video/quicktime': mov,
  };

  const displayFormats = [
    {
      ext: 'MP3',
      name: 'MP3 Audio',
      supported: mp3 !== 'unsupported',
    },
    {
      ext: 'WAV',
      name: 'WAV Audio',
      supported: wav !== 'unsupported',
    },
    {
      ext: 'M4A',
      name: 'M4A / AAC',
      supported: m4a !== 'unsupported',
    },
    {
      ext: 'MP4',
      name: 'MP4 Video',
      supported: mp4 !== 'unsupported',
    },
    {
      ext: 'WEBM',
      name: 'WebM Audio/Video',
      supported: webmOpus !== 'unsupported' || webmVideo !== 'unsupported',
      note: isSafari || isIOS ? 'Limited codec support on Safari' : undefined,
    },
    {
      ext: 'MOV',
      name: 'QuickTime MOV',
      supported: mov !== 'unsupported' || isSafari || isIOS,
      note: !isSafari ? 'Requires AAC/PCM audio stream' : undefined,
    },
  ];

  return {
    isSafari,
    isIOS,
    hasAudioContext,
    hasWorker,
    supportedMimeTypes,
    displayFormats,
  };
}

/**
 * Validates whether a given file is likely decodable by the browser before starting.
 */
export function validateFileCodecCompatibility(file: File): {
  supported: boolean;
  warning?: string;
  errorMessage?: string;
} {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const capabilities = detectBrowserCapabilities();

  // Known formats
  const recognizedExtensions = ['mp3', 'wav', 'm4a', 'aac', 'mp4', 'webm', 'mov', 'ogg'];
  if (!recognizedExtensions.includes(ext)) {
    return {
      supported: false,
      errorMessage: `The file format ".${ext}" is not supported. Please provide an audio or video file (MP3, WAV, M4A, MP4, WEBM, MOV).`,
    };
  }

  // Check Safari WebM specific constraint
  if ((capabilities.isSafari || capabilities.isIOS) && ext === 'webm') {
    return {
      supported: true,
      warning:
        'Safari and iOS have restricted native support for WebM audio codecs (Opus/Vorbis). If decoding fails, convert your media to MP4 or WAV first.',
    };
  }

  return { supported: true };
}
