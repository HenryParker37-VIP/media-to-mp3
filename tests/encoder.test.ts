import { describe, it, expect } from 'vitest';
import * as lamejs from '@breezystack/lamejs';
import { sanitizeFilename } from '@/lib/conversion/mp3-encoder';

describe('MP3 Encoder Functionality', () => {
  it('encodes synthetic PCM sine wave to MP3 frames', () => {
    const Mp3Encoder = lamejs.Mp3Encoder;
    expect(Mp3Encoder).toBeDefined();

    const sampleRate = 44100;
    const channels = 1;
    const bitrate = 192;
    const encoder = new Mp3Encoder(channels, sampleRate, bitrate);

    // Generate 0.5s of 440Hz sine wave PCM
    const durationSeconds = 0.5;
    const totalSamples = Math.floor(sampleRate * durationSeconds);
    const pcmSamples = new Int16Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t);
      pcmSamples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const blockSize = 1152;
    const mp3Chunks: Array<Uint8Array | Int8Array> = [];

    for (let i = 0; i < totalSamples; i += blockSize) {
      const chunk = pcmSamples.subarray(i, i + blockSize);
      const mp3buf = encoder.encodeBuffer(chunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Chunks.push(mp3buf);
      }
    }

    const flushed = encoder.flush();
    if (flushed && flushed.length > 0) {
      mp3Chunks.push(flushed);
    }

    expect(mp3Chunks.length).toBeGreaterThan(0);
    const totalMp3Bytes = mp3Chunks.reduce((acc, c) => acc + c.length, 0);
    expect(totalMp3Bytes).toBeGreaterThan(1000);

    // Check MP3 sync word (0xFFE or 0xFFF)
    const firstChunk = mp3Chunks[0];
    const firstByte = firstChunk[0] & 0xff;
    const secondByte = firstChunk[1] & 0xff;
    expect(firstByte).toBe(0xff);
    expect(secondByte & 0xe0).toBe(0xe0);
  });

  it('sanitizes filenames and appends .mp3 exactly once', () => {
    expect(sanitizeFilename('Rick Astley - Never Gonna Give You Up')).toBe('Rick Astley - Never Gonna Give You Up.mp3');
    expect(sanitizeFilename('my_video.mp4')).toBe('my_video.mp3');
    expect(sanitizeFilename('song.wav')).toBe('song.mp3');
    expect(sanitizeFilename('already.mp3')).toBe('already.mp3');
    expect(sanitizeFilename('bad/name:with*illegal?chars"<>|')).toBe('bad_name_with_illegal_chars.mp3');
    expect(sanitizeFilename('')).toBe('converted-audio.mp3');
    expect(sanitizeFilename(undefined)).toBe('converted-audio.mp3');
  });
});
