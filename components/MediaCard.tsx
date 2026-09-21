'use client';

import React from 'react';
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
  ShieldAlert,
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
    conversionState.stage === 'decoding' ||
    conversionState.stage === 'encoding';

  const isComplete = conversionState.stage === 'complete';
  const isError = conversionState.stage === 'error';

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

  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md transition-all duration-300">
      {/* Top Media Metadata Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Thumbnail Preview with subtle pulse during conversion */}
        <div
          className={`
            relative w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex-shrink-0 flex items-center justify-center
            ${isProcessing ? 'ring-2 ring-sky-500/50 animate-pulse' : ''}
          `}
        >
          {metadata.thumbnailUrl ? (
            <Image
              src={metadata.thumbnailUrl}
              alt={metadata.title}
              fill
              sizes="(max-width: 640px) 100vw, 176px"
              className="object-cover"
              unoptimized
            />
          ) : metadata.format?.toLowerCase() === 'mp4' || metadata.format?.toLowerCase() === 'mov' || metadata.format?.toLowerCase() === 'webm' ? (
            <div className="flex flex-col items-center justify-center text-neutral-500">
              <FileVideo className="w-10 h-10 mb-1 text-sky-400" />
              <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                {metadata.format || 'Video'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-500">
              <FileAudio className="w-10 h-10 mb-1 text-indigo-400" />
              <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                {metadata.format || 'Audio'}
              </span>
            </div>
          )}

          {/* Provider Badge Overlay */}
          <div className="absolute top-2 left-2 flex items-center space-x-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
            {metadata.provider === 'youtube' && (
              <Youtube className="w-3 h-3 text-red-500 fill-red-500" />
            )}
            <span>{metadata.providerName}</span>
          </div>

          {metadata.durationSeconds && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
              {formatDuration(metadata.durationSeconds)}
            </div>
          )}
        </div>

        {/* Media Information */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-1">
            <h3
              className="text-base font-semibold text-white tracking-tight leading-snug line-clamp-2"
              title={metadata.title}
            >
              {metadata.title}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-neutral-400">
              {metadata.author && (
                <span className="font-medium text-neutral-300 truncate max-w-[200px]">
                  {metadata.author}
                </span>
              )}

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

          {/* Canonical link to original source */}
          {metadata.url && (
            <div className="pt-0.5">
              <a
                href={metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-[11px] text-neutral-500 hover:text-sky-400 transition-colors"
              >
                <span className="truncate max-w-[260px] sm:max-w-xs">{metadata.url}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Conversion States or Action Area */}
      <div className="mt-5 pt-4 border-t border-neutral-800/80">
        {isProcessing || isComplete ? (
          <div>
            <ProgressIndicator state={conversionState} />

            {isComplete && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                {onDownloadAgain && (
                  <button
                    type="button"
                    onClick={onDownloadAgain}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/20 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Again</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Convert Another File</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stream Restriction Explanation if YouTube */}
            {!metadata.canDirectDownload ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
                <div className="flex items-start space-x-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-amber-300">
                      Authorized Stream Notice
                    </h4>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      {metadata.restrictionReason ||
                        'This source does not provide an authorized downloadable media stream. You can upload the original file to convert it to MP3.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onTriggerUpload}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 transition-all active:scale-98"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Original File</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="sm:w-auto px-4 py-3 rounded-xl border border-neutral-800 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Authorized Downloadable or Uploaded Media */
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

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onStartConversion}
                    className="flex-1 inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-sky-500/20 transition-all active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MP3</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="px-4 py-3.5 rounded-xl border border-neutral-800 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors text-center"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
