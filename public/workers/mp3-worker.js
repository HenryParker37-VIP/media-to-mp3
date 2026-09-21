// Web Worker for client-side PCM to MP3 conversion using LAME
/* global lamejs */

try {
  importScripts('/workers/lame.js');
} catch (err) {
  console.error('Failed to import LAME script in worker:', err);
}

function floatToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

self.onmessage = function (e) {
  const data = e.data;
  if (!data || data.action !== 'encode') return;

  try {
    const { leftChannel, rightChannel, sampleRate, bitrate, numChannels } = data;

    const Lame = typeof lamejs !== 'undefined' ? lamejs : (self.lamejs || globalThis.lamejs);
    if (!Lame || !Lame.Mp3Encoder) {
      throw new Error('LAME MP3 encoder library could not be loaded in worker context.');
    }

    const channels = numChannels || (rightChannel ? 2 : 1);
    const encoder = new Lame.Mp3Encoder(channels, sampleRate, bitrate);

    const leftInt16 = floatToInt16(leftChannel);
    const rightInt16 = rightChannel ? floatToInt16(rightChannel) : leftInt16;

    const mp3Chunks = [];
    const sampleBlockSize = 1152;
    const totalSamples = leftInt16.length;

    let lastReportedPercent = -1;

    for (let i = 0; i < totalSamples; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = channels === 2 ? rightInt16.subarray(i, i + sampleBlockSize) : leftChunk;

      let mp3buf;
      if (channels === 1) {
        mp3buf = encoder.encodeBuffer(leftChunk);
      } else {
        mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
      }

      if (mp3buf && mp3buf.length > 0) {
        mp3Chunks.push(mp3buf);
      }

      // Compute honest progress based on actual samples processed
      const percent = Math.min(99, Math.floor(((i + leftChunk.length) / totalSamples) * 100));
      if (percent !== lastReportedPercent && percent % 2 === 0) {
        lastReportedPercent = percent;
        self.postMessage({ type: 'progress', percent });
      }
    }

    // Flush any remaining buffer in encoder
    const finalBuffer = encoder.flush();
    if (finalBuffer && finalBuffer.length > 0) {
      mp3Chunks.push(finalBuffer);
    }

    const blob = new Blob(mp3Chunks, { type: 'audio/mpeg' });

    self.postMessage({
      type: 'complete',
      blob,
      percent: 100,
      sizeBytes: blob.size,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown encoding error in worker.';
    self.postMessage({
      type: 'error',
      error: errorMsg,
    });
  }
};
