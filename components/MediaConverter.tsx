'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MediaMetadata,
  QualityOption,
  ConversionState,
  QUALITY_PRESETS,
} from '@/lib/types';
import { MediaCard } from './MediaCard';
import { FormatBadges } from './FormatBadges';
import { validateFileCodecCompatibility } from '@/lib/conversion/capabilities';
import { decodeAudioFromFile } from '@/lib/conversion/audio-decoder';
import {
  encodeAudioBufferToMp3,
  triggerBlobDownload,
} from '@/lib/conversion/mp3-encoder';
import {
  Link as LinkIcon,
  UploadCloud,
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const INITIAL_CONVERSION_STATE: ConversionState = {
  stage: 'idle',
  isIndeterminate: false,
  message: '',
};

export const MediaConverter: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>('high');

  const [conversionState, setConversionState] = useState<ConversionState>(
    INITIAL_CONVERSION_STATE
  );
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Analyze URL via API route
  const handleAnalyzeUrl = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setUrlError('Please paste a media or YouTube URL.');
      return;
    }

    setAnalyzingUrl(true);
    setUrlError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve media metadata.');
      }

      setMetadata(data.metadata);
      setUploadedFile(null);
      setConversionState(INITIAL_CONVERSION_STATE);
      setGeneratedBlob(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to analyze this URL. Please verify the link.';
      setUrlError(message);
      setMetadata(null);
    } finally {
      setAnalyzingUrl(false);
    }
  }, []);

  // Automatic debounce when user pastes or types a valid URL pattern
  useEffect(() => {
    const trimmed = urlInput.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed) {
      setUrlError(null);
      return;
    }

    // Auto-detect YouTube links or direct links
    const isLikelyUrl =
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('youtu.be/') ||
      trimmed.includes('youtube.com/');

    if (isLikelyUrl && trimmed !== metadata?.url) {
      debounceTimerRef.current = setTimeout(() => {
        handleAnalyzeUrl(trimmed);
      }, 450);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [urlInput, handleAnalyzeUrl, metadata?.url]);

  // Handle local file selection
  const handleProcessFile = (file: File) => {
    const check = validateFileCodecCompatibility(file);
    if (!check.supported) {
      setUrlError(check.errorMessage || 'Unsupported file format.');
      return;
    }

    setUrlError(null);
    setUploadedFile(file);

    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    // Create local metadata representation
    setMetadata({
      id: `local-${Date.now()}`,
      url: '',
      title: cleanTitle,
      author: 'Local File',
      thumbnailUrl: '',
      provider: 'upload',
      providerName: 'Uploaded Media',
      fileSizeBytes: file.size,
      format: ext,
      canDirectDownload: true,
      statusNote: check.warning ? check.warning : `Local ${ext} file`,
    });

    setConversionState(INITIAL_CONVERSION_STATE);
    setGeneratedBlob(null);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessFile(file);
    }
  };

  // Trigger conversion process
  const startConversion = async () => {
    if (!metadata) return;

    try {
      let targetFileOrBlob: Blob;

      if (uploadedFile) {
        targetFileOrBlob = uploadedFile;
      } else if (metadata.url && metadata.canDirectDownload) {
        // Direct media URL: fetch stream
        setConversionState({
          stage: 'analyzing',
          isIndeterminate: true,
          message: 'Fetching media stream...',
        });

        const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(metadata.url)}`;
        const mediaRes = await fetch(proxyUrl);
        if (!mediaRes.ok) {
          const errData = await mediaRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to download direct media stream.');
        }
        targetFileOrBlob = await mediaRes.blob();
      } else {
        throw new Error('No downloadable or uploaded media stream available.');
      }

      // 1. Stage: Decoding (indeterminate)
      setConversionState({
        stage: 'decoding',
        isIndeterminate: true,
        message: 'Decoding audio stream in browser...',
      });

      const decoded = await decodeAudioFromFile(
        targetFileOrBlob,
        uploadedFile?.name || metadata.title
      );

      // 2. Stage: Encoding (honest percentage 0-100%)
      setConversionState({
        stage: 'encoding',
        percent: 0,
        isIndeterminate: false,
        message: 'Converting to MP3...',
      });

      const targetBitrate = QUALITY_PRESETS[selectedQuality].bitrate;

      const result = await encodeAudioBufferToMp3({
        audioBuffer: decoded.audioBuffer,
        bitrate: targetBitrate,
        onProgress: (percent) => {
          setConversionState((prev) => ({
            ...prev,
            stage: 'encoding',
            percent,
            isIndeterminate: false,
            message: `Converting to MP3 (${percent}%)`,
          }));
        },
      });

      setGeneratedBlob(result.blob);

      const baseName = metadata.title.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const outputFilename = `${baseName || 'media'}.mp3`;

      // 3. Stage: Complete
      setConversionState({
        stage: 'complete',
        percent: 100,
        isIndeterminate: false,
        message: 'Download complete',
        outputFileName: outputFilename,
      });

      // Automatically trigger universal browser download
      triggerBlobDownload(result.blob, outputFilename);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Conversion failed unexpectedly.';
      setConversionState({
        stage: 'error',
        isIndeterminate: false,
        message: 'Conversion error',
        error: message,
      });
    }
  };

  const handleDownloadAgain = () => {
    if (generatedBlob && conversionState.outputFileName) {
      triggerBlobDownload(generatedBlob, conversionState.outputFileName);
    }
  };

  const handleReset = () => {
    setUrlInput('');
    setMetadata(null);
    setUploadedFile(null);
    setUrlError(null);
    setConversionState(INITIAL_CONVERSION_STATE);
    setGeneratedBlob(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
      {/* App Header & Branding */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold tracking-wide mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Privacy-First Media Converter</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Download your media
        </h1>
        <p className="text-sm text-neutral-400 max-w-md mx-auto">
          Paste a YouTube or media URL, or drop your files to convert them directly in your browser.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {metadata ? (
          /* Render Analyzed Media Card */
          <MediaCard
            metadata={metadata}
            quality={selectedQuality}
            onQualityChange={setSelectedQuality}
            conversionState={conversionState}
            onStartConversion={startConversion}
            onTriggerUpload={() => fileInputRef.current?.click()}
            onReset={handleReset}
            onDownloadAgain={generatedBlob ? handleDownloadAgain : undefined}
          />
        ) : (
          /* Render URL Input and Upload Dropzone */
          <div className="space-y-6">
            {/* URL Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAnalyzeUrl(urlInput);
              }}
              className="space-y-2"
            >
              <label
                htmlFor="url-input"
                className="block text-xs font-medium text-neutral-400 uppercase tracking-wider"
              >
                Paste a YouTube or media URL
              </label>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  id="url-input"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or direct media link"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={analyzingUrl}
                  className="w-full pl-10 pr-28 py-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-all"
                  aria-label="Media URL input"
                />
                <button
                  type="submit"
                  disabled={analyzingUrl || !urlInput.trim()}
                  className="absolute right-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-neutral-800 text-white disabled:text-neutral-500 text-xs font-semibold tracking-wide transition-all active:scale-95 disabled:pointer-events-none flex items-center space-x-1.5"
                >
                  {analyzingUrl ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Analyze</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {urlError && (
              <div
                role="alert"
                className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>{urlError}</span>
              </div>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-neutral-800 w-full" />
              <span className="bg-neutral-900 px-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-widest absolute">
                OR
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload original file drag and drop zone"
              className={`
                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-sky-500
                ${
                  isDragActive
                    ? 'border-sky-400 bg-sky-950/20 scale-[1.01]'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 hover:bg-neutral-950/70'
                }
              `}
            >
              <div className="w-12 h-12 rounded-full bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-sky-400 mb-3 shadow-md">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-200 mb-1">
                Drop your original media file here
              </p>
              <p className="text-xs text-neutral-500 mb-3">
                or click to browse from your device
              </p>
              <FormatBadges />
            </div>

            {/* Hidden Native File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.webm,.m4a,.wav,.mp3,.ogg,.aac"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />

            {/* Privacy and Trust Indicators */}
            <div className="flex items-center justify-center space-x-2 text-xs text-neutral-500 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
              <span>100% Client-Side Conversion • Media Never Leaves Your Device</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Limitations Note */}
      <footer className="mt-8 text-center text-[11px] text-neutral-500 space-y-1">
        <p>
          Complies with platform terms: YouTube metadata displayed via official oEmbed API.
        </p>
        <p>
          Converts user-uploaded media and authorized direct streams to standard MP3.
        </p>
      </footer>
    </div>
  );
};
