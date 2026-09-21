/**
 * Client-side audio decoder using Web Audio API with Safari/iOS unlocks and precise error handling.
 */

export interface DecodedAudioResult {
  audioBuffer: AudioBuffer;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
}

export async function decodeAudioFromFile(
  file: File | Blob,
  fileName = 'file'
): Promise<DecodedAudioResult> {
  // 1. Create AudioContext (handling standard and webkit prefixes)
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      'Web Audio API is not supported by your browser. Please upgrade your browser to convert audio.'
    );
  }

  const audioCtx = new AudioContextClass();

  try {
    // 2. iOS Safari requires AudioContext resume if suspended
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // 3. Read file into ArrayBuffer
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch {
      throw new Error('Failed to read the media file into memory. It may be locked or inaccessible.');
    }

    if (arrayBuffer.byteLength === 0) {
      throw new Error('The selected file is empty (0 bytes).');
    }

    // 4. Decode audio data
    let audioBuffer: AudioBuffer;
    try {
      // Modern promise-based decodeAudioData with callback fallback for legacy WebKit
      audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        // Clone arrayBuffer because decodeAudioData can detach the buffer on some platforms
        const bufferCopy = arrayBuffer.slice(0);
        const result = audioCtx.decodeAudioData(
          bufferCopy,
          (buf) => resolve(buf),
          (err) => reject(err)
        );
        if (result && typeof (result as Promise<AudioBuffer>).then === 'function') {
          (result as Promise<AudioBuffer>).then(resolve).catch(reject);
        }
      });
    } catch {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isSafariOrIOS =
        /safari/.test(userAgent) && !/chrome|chromium|edg|crios|fxios/.test(userAgent);

      if (isSafariOrIOS && (ext === 'webm' || ext === 'ogg')) {
        throw new Error(
          `Safari does not support decoding .${ext.toUpperCase()} (Opus/Vorbis). Please upload a standard MP4, MOV, or WAV file.`
        );
      }

      throw new Error(
        `Unable to decode the audio stream in this .${ext.toUpperCase()} file. The format or codec may not be supported by your browser.`
      );
    }

    return {
      audioBuffer,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
    };
  } finally {
    // Clean up AudioContext to prevent exceeding maximum audio context count (especially in Safari)
    try {
      await audioCtx.close();
    } catch {
      // Ignore cleanup error
    }
  }
}
