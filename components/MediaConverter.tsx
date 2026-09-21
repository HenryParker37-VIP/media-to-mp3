'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MediaMetadata,
  QualityOption,
  ConversionState,
  QUALITY_PRESETS,
  DEFAULT_QUALITY,
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
  AlertCircle,
  Loader2,
  FileCheck,
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
  // Default quality: standard (192 kbps)
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>(DEFAULT_QUALITY);

  // Reference to original YouTube metadata if the user uploads a file following a YouTube preview
  const [referencedYouTubeMeta, setReferencedYouTubeMeta] = useState<MediaMetadata | null>(null);

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
      setReferencedYouTubeMeta(null);
      setUploadedFile(null);
      setConversionState(INITIAL_CONVERSION_STATE);
      setGeneratedBlob(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to analyze this URL. Please check the link.';
      setUrlError(message);
      setMetadata(null);
    } finally {
      setAnalyzingUrl(false);
    }
  }, []);

  // Automatic debounce when user pastes or types a valid URL pattern (350ms)
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
      }, 380);
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
      setUrlError(
        check.errorMessage ||
          'This file uses a media format or codec that this browser cannot decode.'
      );
      return;
    }

    setUrlError(null);
    setUploadedFile(file);

    // If we previously had a YouTube preview, preserve it as a reference card
    if (metadata && metadata.provider === 'youtube') {
      setReferencedYouTubeMeta(metadata);
    }

    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    // Set local metadata for conversion
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
      statusNote: check.warning ? check.warning : `Local ${ext} file ready`,
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

  // Trigger conversion process with real states and authentic progress
  const startConversion = async () => {
    if (!metadata) return;

    try {
      let targetFileOrBlob: Blob;

      if (uploadedFile) {
        targetFileOrBlob = uploadedFile;
      } else if (metadata.url && metadata.canDirectDownload) {
        // Direct media URL: fetch stream safely
        setConversionState({
          stage: 'preparing',
          isIndeterminate: true,
          message: 'Preparing audio stream…',
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
        message: 'Decoding media track in browser…',
      });

      const decoded = await decodeAudioFromFile(
        targetFileOrBlob,
        uploadedFile?.name || metadata.title
      );

      // 2. Stage: Converting / Encoding (honest measured percentage 0-100%)
      setConversionState({
        stage: 'converting',
        percent: 0,
        isIndeterminate: false,
        message: 'Converting to MP3 (0%)',
      });

      const targetBitrate = QUALITY_PRESETS[selectedQuality].bitrate;

      const result = await encodeAudioBufferToMp3({
        audioBuffer: decoded.audioBuffer,
        bitrate: targetBitrate,
        onProgress: (percent) => {
          setConversionState((prev) => ({
            ...prev,
            stage: 'converting',
            percent,
            isIndeterminate: false,
            message: `Converting to MP3 (${percent}%)`,
          }));
        },
      });

      // 3. Stage: Finalizing
      setConversionState({
        stage: 'finalizing',
        percent: 100,
        isIndeterminate: true,
        message: 'Finalizing MP3…',
      });

      setGeneratedBlob(result.blob);

      const baseName = (metadata.title || 'converted-audio')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .trim();
      const outputFilename = `${baseName}.mp3`;

      // 4. Stage: Complete / MP3 ready
      setConversionState({
        stage: 'complete',
        percent: 100,
        isIndeterminate: false,
        message: 'MP3 ready',
        outputFileName: outputFilename,
      });

      // Automatically trigger universal browser download
      triggerBlobDownload(result.blob, outputFilename);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'This file uses a media format or codec that this browser cannot decode.';
      setConversionState({
        stage: 'error',
        isIndeterminate: false,
        message: "Couldn't read this file",
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
    setReferencedYouTubeMeta(null);
    setUploadedFile(null);
    setUrlError(null);
    setConversionState(INITIAL_CONVERSION_STATE);
    setGeneratedBlob(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center"
    >
      {/* App Header & Hero */}
      <div className="text-center space-y-2 mb-7">
        <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 text-[11px] font-medium tracking-wide mb-1.5">
          <span>MediaDrop</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-400">In-Browser Audio Converter</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Convert media to MP3
        </h1>
        <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
          Paste a media link or upload a file to analyze and convert supported media directly in your browser.
        </p>
      </div>

      {/* Main Single Card Container */}
      <div
        className={`
          w-full bg-neutral-900/70 border rounded-2xl p-5 sm:p-7 shadow-xl transition-all duration-200
          ${
            isDragActive
              ? 'border-sky-400 ring-2 ring-sky-400/20 bg-sky-950/20'
              : 'border-neutral-800'
          }
        `}
      >
        {/* Drag Overlay Alert */}
        {isDragActive && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <UploadCloud className="w-10 h-10 text-sky-400 animate-bounce" />
            <p className="text-sm font-semibold text-white">Drop to convert</p>
            <p className="text-xs text-neutral-400">Audio or video file will be decoded locally</p>
          </div>
        )}

        {!isDragActive && (
          <>
            {/* If YouTube reference exists while an uploaded file is active */}
            {referencedYouTubeMeta && metadata?.provider === 'upload' && (
              <div className="mb-4 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <FileCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span className="text-neutral-400 truncate">
                    Target audio for: <strong className="text-neutral-200">{referencedYouTubeMeta.title}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReferencedYouTubeMeta(null)}
                  className="text-neutral-500 hover:text-neutral-300 text-[11px] ml-2 flex-shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

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
              /* Render URL Input and Upload Area */
              <div className="space-y-5">
                {/* URL Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAnalyzeUrl(urlInput);
                  }}
                  className="space-y-1.5"
                >
                  <label
                    htmlFor="url-input"
                    className="block text-xs font-medium text-neutral-400 tracking-wide"
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
                      placeholder="Paste a YouTube or media URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={analyzingUrl}
                      className="w-full pl-10 pr-28 py-3 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-all"
                      aria-label="Media URL input"
                    />
                    <button
                      type="submit"
                      disabled={analyzingUrl || !urlInput.trim()}
                      className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-neutral-800 text-white disabled:text-neutral-500 text-xs font-semibold transition-all active:scale-95 disabled:pointer-events-none flex items-center space-x-1.5"
                    >
                      {analyzingUrl ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing…</span>
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

                {/* Error Alert */}
                {urlError && (
                  <div
                    role="alert"
                    className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <div className="flex-1">
                      <p>{urlError}</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-1.5 text-[11px] font-semibold text-sky-400 hover:underline inline-block"
                      >
                        Try another file →
                      </button>
                    </div>
                  </div>
                )}

                {/* Drop Area & File Picker */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload original file"
                  className="border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 hover:bg-neutral-950/70 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
                >
                  <UploadCloud className="w-6 h-6 text-neutral-400 mb-2" />
                  <p className="text-xs font-medium text-neutral-300">
                    or drop a file here
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 mb-2">
                    click to select from your device
                  </p>
                  <FormatBadges />
                </div>
              </div>
            )}
          </>
        )}

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
      </div>

      {/* Footer / Privacy Statement */}
      <footer className="mt-8 text-center text-xs text-neutral-500 space-y-1">
        <p>Media conversion happens locally in your browser whenever supported.</p>
        <p className="text-[11px] text-neutral-600">Files are not uploaded during local conversion.</p>
      </footer>
    </div>
  );
};
