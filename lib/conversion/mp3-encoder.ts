/**
 * MP3 encoding coordinator managing Web Worker execution and real progress updates.
 */

export interface EncodeOptions {
  audioBuffer: AudioBuffer;
  bitrate: number; // 320, 192, 128
  onProgress?: (percent: number) => void;
}

export interface EncodeResult {
  blob: Blob;
  sizeBytes: number;
}

export async function encodeAudioBufferToMp3(
  options: EncodeOptions
): Promise<EncodeResult> {
  const { audioBuffer, bitrate, onProgress } = options;

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : undefined;
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels > 1 ? 2 : 1;

  // Try Web Worker first for non-blocking UI
  if (typeof window !== 'undefined' && typeof window.Worker !== 'undefined') {
    try {
      return await encodeWithWorker({
        leftChannel,
        rightChannel,
        sampleRate,
        bitrate,
        numChannels,
        onProgress,
      });
    } catch (workerErr) {
      console.warn('Worker encoding encountered an issue, falling back to main-thread encoder:', workerErr);
    }
  }

  // Fallback: in-thread chunked encoding
  return encodeInThread({
    leftChannel,
    rightChannel,
    sampleRate,
    bitrate,
    numChannels,
    onProgress,
  });
}

interface WorkerTaskParams {
  leftChannel: Float32Array;
  rightChannel?: Float32Array;
  sampleRate: number;
  bitrate: number;
  numChannels: number;
  onProgress?: (percent: number) => void;
}

function encodeWithWorker(params: WorkerTaskParams): Promise<EncodeResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker('/workers/mp3-worker.js');
    } catch (e) {
      return reject(e);
    }

    worker.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'progress') {
        if (params.onProgress && typeof msg.percent === 'number') {
          params.onProgress(msg.percent);
        }
      } else if (msg.type === 'complete') {
        worker.terminate();
        resolve({
          blob: msg.blob,
          sizeBytes: msg.sizeBytes,
        });
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.error || 'Worker encoding error.'));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker script error: ${err.message}`));
    };

    worker.postMessage({
      action: 'encode',
      leftChannel: params.leftChannel,
      rightChannel: params.rightChannel,
      sampleRate: params.sampleRate,
      bitrate: params.bitrate,
      numChannels: params.numChannels,
    });
  });
}

/**
 * Fallback main thread chunking with requestAnimationFrame to prevent locking the UI
 */
async function encodeInThread(params: WorkerTaskParams): Promise<EncodeResult> {
  // Dynamically import @breezystack/lamejs on main thread if needed
  const lame = await import('@breezystack/lamejs');
  const Mp3EncoderClass = lame.Mp3Encoder || lame.default?.Mp3Encoder;

  if (!Mp3EncoderClass) {
    throw new Error('Could not load MP3 encoder library.');
  }

  const encoder = new Mp3EncoderClass(params.numChannels, params.sampleRate, params.bitrate);

  function floatToInt16(f32: Float32Array): Int16Array {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return i16;
  }

  const leftInt16 = floatToInt16(params.leftChannel);
  const rightInt16 = params.rightChannel ? floatToInt16(params.rightChannel) : leftInt16;

  const mp3Chunks: Array<Uint8Array | Int8Array> = [];
  const sampleBlockSize = 1152;
  const totalSamples = leftInt16.length;

  let offset = 0;

  return new Promise((resolve) => {
    function processBatch() {
      const batchEnd = Math.min(offset + sampleBlockSize * 40, totalSamples);
      while (offset < batchEnd) {
        const leftChunk = leftInt16.subarray(offset, offset + sampleBlockSize);
        const rightChunk =
          params.numChannels === 2 ? rightInt16.subarray(offset, offset + sampleBlockSize) : leftChunk;

        const mp3buf =
          params.numChannels === 1
            ? encoder.encodeBuffer(leftChunk)
            : encoder.encodeBuffer(leftChunk, rightChunk);

        if (mp3buf && mp3buf.length > 0) {
          mp3Chunks.push(mp3buf);
        }

        offset += sampleBlockSize;
      }

      const percent = Math.min(99, Math.floor((offset / totalSamples) * 100));
      if (params.onProgress) {
        params.onProgress(percent);
      }

      if (offset < totalSamples) {
        setTimeout(processBatch, 0);
      } else {
        const finalBuffer = encoder.flush();
        if (finalBuffer && finalBuffer.length > 0) {
          mp3Chunks.push(finalBuffer);
        }

        const blob = new Blob(mp3Chunks as BlobPart[], { type: 'audio/mpeg' });
        if (params.onProgress) {
          params.onProgress(100);
        }
        resolve({
          blob,
          sizeBytes: blob.size,
        });
      }
    }

    processBatch();
  });
}

/**
 * Universal browser download handler, fully compatible with Chrome, Safari, and iPhone/iOS.
/**
 * Sanitizes a title or filename for safe browser downloading, appending .mp3 exactly once.
 */
export function sanitizeFilename(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return 'converted-audio.mp3';
  let clean = rawName
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .trim();
  // Remove existing audio/video extension if present
  clean = clean.replace(/\.(mp3|wav|m4a|mp4|webm|mov|ogg|aac|flac)$/i, '').trim();
  // Collapse consecutive underscores and trim
  clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '').trim();
  if (!clean) return 'converted-audio.mp3';
  if (clean.length > 120) {
    clean = clean.substring(0, 120).trim();
  }
  return `${clean}.mp3`;
}

/**
 * Universal browser download handler, fully compatible with Chrome, Safari, and iPhone/iOS.
 */
export function triggerBlobDownload(blob: Blob, rawFilename: string): void {
  const safeFilename = sanitizeFilename(rawFilename);
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  anchor.style.display = 'none';

  // Safari / iOS compatibility
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup object URL after browser has begun download
  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }, 1500);
}
