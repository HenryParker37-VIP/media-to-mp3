import { MediaMetadata } from '../types';
import { MediaProvider } from './types';

export class YouTubeProvider implements MediaProvider {
  readonly id = 'youtube';
  readonly name = 'YouTube';

  /**
   * Matches YouTube video IDs across standard formats:
   * - https://www.youtube.com/watch?v=VIDEO_ID
   * - https://youtu.be/VIDEO_ID
   * - https://youtube.com/shorts/VIDEO_ID
   * - https://youtube.com/embed/VIDEO_ID
   * - https://music.youtube.com/watch?v=VIDEO_ID
   */
  canHandle(rawUrl: string): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    const url = rawUrl.trim();
    return (
      /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu(?:be\.com|\.be)\/(?:watch\?v=|shorts\/|embed\/|live\/)?([a-zA-Z0-9_-]{11})/i.test(
        url
      )
    );
  }

  /**
   * Extracts the 11-character video ID from a YouTube URL.
   */
  extractVideoId(rawUrl: string): string | null {
    if (!rawUrl) return null;
    const url = rawUrl.trim();

    // Standard youtu.be/ID
    const shortMatch = url.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch) return shortMatch[1];

    // Standard youtube.com/watch?v=ID or shorts/ID or embed/ID
    const fullMatch = url.match(
      /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/i
    );
    if (fullMatch) return fullMatch[1];

    return null;
  }

  async fetchMetadata(rawUrl: string): Promise<MediaMetadata> {
    const videoId = this.extractVideoId(rawUrl);
    if (!videoId) {
      throw new Error('Could not identify a valid YouTube video ID from the provided URL.');
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      response = await fetch(oembedEndpoint, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MediaDrop/1.0 (Authorized Media Metadata Fetcher)',
        },
      });
      clearTimeout(timeout);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Connection timed out while querying YouTube metadata.');
      }
      throw new Error('Network failure while retrieving YouTube metadata. Please check your connection.');
    }

    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        throw new Error('This YouTube video is unavailable, private, deleted, or restricted.');
      }
      throw new Error(`YouTube metadata service returned error (${response.status}).`);
    }

    let data: {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };

    try {
      data = await response.json();
    } catch {
      throw new Error('Received an unreadable response from YouTube metadata service.');
    }

    const title = data.title?.trim() || `YouTube Video (${videoId})`;
    const author = data.author_name?.trim() || 'Unknown Creator';
    const authorUrl = data.author_url?.trim();
    // Use the official oEmbed thumbnail_url if provided, with standard fallback to hqdefault
    const thumbnailUrl =
      data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: videoId,
      url: canonicalUrl,
      title,
      author,
      authorUrl,
      thumbnailUrl,
      provider: 'youtube',
      providerName: 'YouTube',
      canDirectDownload: false,
      statusNote: 'YouTube Media (Stream Restricted)',
      restrictionReason:
        'This source does not provide an authorized downloadable media stream. You can upload the original file to convert it to MP3.',
    };
  }
}
