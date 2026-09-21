import { NextRequest, NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/security/ssrf';

export const runtime = 'nodejs';

const MAX_PROXY_BYTES = 100 * 1024 * 1024; // 100 MB limit

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json(
        { error: 'Missing "url" search parameter.' },
        { status: 400 }
      );
    }

    const safeUrl = await validateSafeUrl(rawUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const remoteRes = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MediaDrop/1.0 (Authorized Media Stream Proxy)',
      },
    });
    clearTimeout(timeout);

    if (!remoteRes.ok) {
      return NextResponse.json(
        { error: `Upstream media server returned error (${remoteRes.status}).` },
        { status: 502 }
      );
    }

    const contentType = remoteRes.headers.get('content-type') || '';
    const isAudioOrVideo =
      contentType.startsWith('audio/') ||
      contentType.startsWith('video/') ||
      contentType === 'application/octet-stream';

    if (!isAudioOrVideo) {
      return NextResponse.json(
        { error: 'Target URL did not return an authorized audio or video stream.' },
        { status: 400 }
      );
    }

    const contentLength = remoteRes.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_PROXY_BYTES) {
      return NextResponse.json(
        { error: 'Media stream exceeds maximum allowable size (100MB).' },
        { status: 413 }
      );
    }

    if (!remoteRes.body) {
      return NextResponse.json(
        { error: 'Empty media stream received from upstream server.' },
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType || 'application/octet-stream');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Cache-Control', 'no-store');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(remoteRes.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unable to stream media from the specified URL.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
