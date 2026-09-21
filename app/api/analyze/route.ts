import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry } from '@/lib/providers/registry';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let body: { url?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { url } = body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid URL to analyze.' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // Basic length check to prevent DOS
    if (trimmedUrl.length > 2048) {
      return NextResponse.json(
        { success: false, error: 'URL exceeds maximum allowable length.' },
        { status: 400 }
      );
    }

    const metadata = await providerRegistry.resolveMetadata(trimmedUrl);
    return NextResponse.json({ success: true, metadata });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while analyzing the URL.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
