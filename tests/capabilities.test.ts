import { describe, it, expect } from 'vitest';
import { validateFileCodecCompatibility } from '@/lib/conversion/capabilities';

describe('Media Capabilities & Codec Compatibility', () => {
  it('identifies standard audio and video containers as supported', () => {
    const wavFile = new File(['dummy'], 'sample.wav', { type: 'audio/wav' });
    expect(validateFileCodecCompatibility(wavFile).supported).toBe(true);

    const mp3File = new File(['dummy'], 'sample.mp3', { type: 'audio/mpeg' });
    expect(validateFileCodecCompatibility(mp3File).supported).toBe(true);

    const m4aFile = new File(['dummy'], 'sample.m4a', { type: 'audio/mp4' });
    expect(validateFileCodecCompatibility(m4aFile).supported).toBe(true);

    const mp4File = new File(['dummy'], 'sample.mp4', { type: 'video/mp4' });
    expect(validateFileCodecCompatibility(mp4File).supported).toBe(true);
  });

  it('rejects unsupported file formats cleanly', () => {
    const exeFile = new File(['dummy'], 'malicious.exe', { type: 'application/octet-stream' });
    const result = validateFileCodecCompatibility(exeFile);
    expect(result.supported).toBe(false);
    expect(result.errorMessage).toContain('is not supported');
  });
});
