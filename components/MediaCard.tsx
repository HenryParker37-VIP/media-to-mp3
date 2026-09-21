'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MediaMetadata, QualityOption, ConversionState } from '@/lib/types';
import { QualitySelector } from './QualitySelector';
import { ProgressIndicator } from './ProgressIndicator';
import {
  Youtube,
  FileAudio,
  FileVideo,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  HardDrive,
} from 'lucide-react';

interface MediaCardProps {
  metadata: MediaMetadata;
  quality: QualityOption;
  onQualityChange: (quality: QualityOption) => void;
  conversionState: ConversionState;
  onStartConversion: () => void;
  onTriggerUpload: () => void;
  onReset: () => void;
  onDownloadAgain?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  metadata,
  quality,
  onQualityChange,
  conversionState,
  onStartConversion,
  onTriggerUpload,
  onReset,
  onDownloadAgain,
}) => {
  const isProcessing =
    conversionState.stage === 'analyzing' ||
    conversionState.stage === 'preparing' ||
    conversionState.stage === 'decoding' ||
    conversionState.stage === 'converting' ||
    conversionState.stage === 'finalizing';

  const isComplete = conversionState.stage === 'complete';
  const isError = conversionState.stage === 'error';

  // Thumbnail fallback chain: maxresdefault -> hqdefault -> mqdefault
  const [thumbSrc, setThumbSrc] = useState<string>(metadata.thumbnailUrl || '');
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    if (metadata.provider === 'youtube' && metadata.id) {
      setThumbSrc(`https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg`);
      setFallbackIndex(0);
    } else {
      setThumbSrc(metadata.thumbnailUrl || '');
    }
  }, [metadata.id, metadata.provider, metadata.thumbnailUrl]);

  const handleImageError = () => {
    if (metadata.provider === 'youtube' && metadata.id) {
      const fallbacks = [
        `https://i.ytimg.com/vi/${metadata.id}/mqdefault.jpg`,
        `https://i.ytimg.com/vi/${metadata.id}/default.jpg`,
      ];
      if (fallbackIndex < fallbacks.length) {
        setThumbSrc(fallbacks[fallbackIndex]);
        setFallbackIndex((prev) => prev + 1);
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isYouTube = metadata.provider === 'youtube';

  return (
    <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200">
      {/* Media Details Row (Responsive side-by-side on desktop, stacked on mobile) */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        {/* Media Thumbnail */}
        <div
          className={`
            relative w-full sm:w-48 aspect-video sm:aspect-[16/10] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800/80 flex-shrink-0 flex items-center justify-center
            ${isProcessing ? 'ring-2 ring-sky-500/40 animate-pulse' : ''}
          `}
        >
          {thumbSrc ? (
            <Image
              src={thumbSrc}
              alt={metadata.title}
              onError={handleImageError}
              fill
              sizes="(max-width: 640px) 100vw, 192px"
              className="object-cover"
              unoptimized
            />
          ) : metadata.format?.toLowerCase() === 'mp4' ||
            metadata.format?.toLowerCase() === 'mov' ||
            metadata.format?.toLowerCase() === 'webm' ? (
            <div className="flex flex-col items-center justify-center text-neutral-500 py-4">
              <FileVideo className="w-8 h-8 mb-1 text-sky-400" />
              <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                {metadata.format || 'Video'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-500 py-4">
              <FileAudio className="w-8 h-8 mb-1 text-indigo-400" />
              <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                {metadata.format || 'Audio'}
              </span>
            </div>
          )}

          {/* Provider Badge */}
          <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[11px] font-medium text-white border border-white/10">
            {isYouTube && <Youtube className="w-3.5 h-3.5 text-red-500 fill-red-500" />}
            <span>{isYouTube ? 'YouTube' : metadata.providerName}</span>
          </div>

          {metadata.durationSeconds && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
              {formatDuration(metadata.durationSeconds)}
            </div>
          )}
        </div>

        {/* Media Information */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          <div className="space-y-1">
            <h3
              className="text-base font-semibold text-white tracking-tight leading-snug line-clamp-2"
              title={metadata.title}
            >
              {metadata.title}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-neutral-400">
              {metadata.author && (
                <span className="font-medium text-neutral-300 truncate max-w-[220px]">
                  {metadata.author}
                </span>
              )}

              {/* Status Indicator */}
              <span className="inline-flex items-center text-neutral-400 text-xs">
                {metadata.statusNote || (isYouTube ? 'Preview available' : 'Ready to convert')}
              </span>

              {metadata.durationSeconds && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{formatDuration(metadata.durationSeconds)}</span>
                </span>
              )}

              {metadata.fileSizeBytes && (
                <span className="flex items-center space-x-1">
                  <HardDrive className="w-3 h-3 text-neutral-500" />
                  <span>{formatFileSize(metadata.fileSizeBytes)}</span>
                </span>
              )}
            </div>
          </div>

          {/* External Source Link */}
          {metadata.url && (
            <div className="pt-0.5">
              <a
                href={metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-neutral-500 hover:text-sky-400 transition-colors"
              >
                <span className="truncate max-w-[240px] sm:max-w-xs">{metadata.url}</span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Subtle Neutral Information for YouTube (No large yellow box) */}
          {isYouTube && (
            <div className="pt-1 flex items-start space-x-2 text-xs text-neutral-400 leading-relaxed">
              <Info className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <span>
                Direct audio extraction isn&apos;t available for this source. Upload your media file to convert it to MP3.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Area / Processing States */}
      <div className="mt-5 pt-4 border-t border-neutral-800">
        {isProcessing || isComplete ? (
          <div>
            <ProgressIndicator state={conversionState} />

            {isComplete && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                {onDownloadAgain && (
                  <button
                    type="button"
                    onClick={onDownloadAgain}
                    className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-md active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MP3</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition-all active:scale-98"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Convert another file</span>
                </button>
              </div>
            )}
          </div>
        ) : isYouTube ? (
          /* YouTube Actions: Clean, intentional, no warning styling */
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onTriggerUpload}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all active:scale-98 shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>Upload file to convert</span>
            </button>

            <a
              href={metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-neutral-800 hover:bg-neutral-800/80 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onReset}
              className="min-h-[44px] px-4 py-3 rounded-xl border border-neutral-800/80 hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        ) : (
          /* Authorized or Uploaded Media: Conversion Controls */
          <div className="space-y-4">
            <QualitySelector
              value={quality}
              onChange={onQualityChange}
              disabled={isProcessing}
            />

            {isError && conversionState.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {conversionState.error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={onStartConversion}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-md active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Convert to MP3</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="min-h-[44px] px-4 py-3.5 rounded-xl border border-neutral-800 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
