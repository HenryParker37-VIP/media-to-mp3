import { MediaMetadata } from '../types';
import { validateSafeUrl } from '../security/ssrf';
import { MediaProvider } from './types';

const DIRECT_MEDIA_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'm4a',
  'mp4',
  'webm',
  'ogg',
  'aac',
  'flac',
  'mov',
]);

export class DirectMediaProvider implements MediaProvider {
  readonly id = 'direct';
  readonly name = 'Direct Media';

  canHandle(rawUrl: string): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const pathname = parsed.pathname.toLowerCase();
      const ext = pathname.split('.').pop();
      return !!ext && DIRECT_MEDIA_EXTENSIONS.has(ext);
    } catch {
      return false;
    }
  }

  async fetchMetadata(rawUrl: string): Promise<MediaMetadata> {
    const safeUrl = await validateSafeUrl(rawUrl);
    const pathname = safeUrl.pathname;
    const fileName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'media-file';
    const ext = fileName.split('.').pop()?.toLowerCase() || 'media';

    let fileSizeBytes: number | undefined;
    let contentType = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const headRes = await fetch(safeUrl.toString(), {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'MediaDrop/1.0 (Direct Media Header Inspector)',
        },
      });
      clearTimeout(timeout);

      if (headRes.ok) {
        contentType = headRes.headers.get('content-type') || '';
        const len = headRes.headers.get('content-length');
        if (len) {
          const parsedLen = Number.parseInt(len, 10);
          if (!Number.isNaN(parsedLen) && parsedLen > 0) {
            fileSizeBytes = parsedLen;
          }
        }
      }
    } catch {
      // HEAD might not be supported or timed out; proceed with URL fallback
    }

    const title = decodeURIComponent(fileName).replace(/[-_]/g, ' ');

    return {
      id: safeUrl.toString(),
      url: safeUrl.toString(),
      title,
      author: safeUrl.hostname,
      thumbnailUrl: '', // Will display custom audio waveform or video badge in UI
      provider: 'direct',
      providerName: 'Direct Media Link',
      fileSizeBytes,
      format: ext.toUpperCase(),
      canDirectDownload: true,
      statusNote: contentType ? `Authorized Stream (${contentType})` : `Direct Media (${ext.toUpperCase()})`,
    };
  }
}
