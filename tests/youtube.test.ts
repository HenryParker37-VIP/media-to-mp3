import { describe, it, expect } from 'vitest';
import { YouTubeProvider } from '@/lib/providers/youtube';

describe('YouTubeProvider', () => {
  const provider = new YouTubeProvider();

  it('correctly matches valid YouTube URLs', () => {
    expect(provider.canHandle('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(provider.canHandle('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(provider.canHandle('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    expect(provider.canHandle('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(provider.canHandle('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects non-YouTube or invalid URLs', () => {
    expect(provider.canHandle('https://vimeo.com/123456')).toBe(false);
    expect(provider.canHandle('https://example.com/audio.mp3')).toBe(false);
    expect(provider.canHandle('invalid string')).toBe(false);
  });

  it('extracts correct video IDs', () => {
    expect(provider.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(provider.extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(provider.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
  });

  it('returns false for direct download capability and provides clear explanation', async () => {
    // Note: Live oEmbed test for Rick Astley
    const meta = await provider.fetchMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(meta.canDirectDownload).toBe(false);
    expect(meta.id).toBe('dQw4w9WgXcQ');
    expect(meta.provider).toBe('youtube');
    expect(meta.title).toBeTruthy();
    expect(meta.author).toBeTruthy();
    expect(meta.thumbnailUrl).toContain('dQw4w9WgXcQ');
    expect(meta.restrictionReason).toContain('This source does not provide an authorized downloadable media stream');
  });
});
