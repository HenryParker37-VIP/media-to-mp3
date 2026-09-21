'use client';

import React from 'react';
import { ConversionState } from '@/lib/types';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  state: ConversionState;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ state }) => {
  const { stage, percent, isIndeterminate, message } = state;

  const isComplete = stage === 'complete';
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const numericPercent = Math.max(0, Math.min(100, percent ?? 0));
  const strokeDashoffset = circumference - (numericPercent / 100) * circumference;

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4">
      {/* Circular Progress & Completion Area */}
      <div className="relative w-24 h-24 flex items-center justify-center mb-4">
        {/* Background Track */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="5"
            fill="transparent"
            className="text-neutral-800"
          />

          {!isComplete && !isIndeterminate && (
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="url(#gradient-progress)"
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-200 ease-out"
            />
          )}

          <defs>
            <linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>

        {/* Indeterminate Spinner Overlay */}
        {isIndeterminate && !isComplete && (
          <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
            <div className="w-20 h-20 rounded-full border-t-2 border-r-2 border-sky-400 opacity-90" />
          </div>
        )}

        {/* Center Content: Percent, Pulse, or Checkmark */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 animate-in zoom-in-75 duration-300">
              <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-emerald-400" />
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
          ) : isIndeterminate ? (
            <div className="w-4 h-4 rounded-full bg-sky-400 animate-pulse-glow" />
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold tracking-tight text-white font-mono">
                {numericPercent}%
              </span>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                MP3
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Message and Status Indicator */}
      <div className="text-center space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold tracking-wide text-neutral-100">
          {isComplete ? 'MP3 ready' : message}
        </h4>
        <p className="text-xs text-neutral-400">
          {isComplete
            ? 'Your audio has been converted and is ready.'
            : isIndeterminate
            ? stage === 'preparing'
              ? 'Reading media stream in browser…'
              : stage === 'finalizing'
              ? 'Packing audio frames…'
              : 'Decoding media track in browser…'
            : `Encoding frames (${numericPercent}%)`}
        </p>
      </div>

      {/* Horizontal Progress Bar */}
      <div className="w-full max-w-xs mt-4 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        {isIndeterminate && !isComplete ? (
          <div className="w-full h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse" />
        ) : (
          <div
            className={`h-full transition-all duration-200 ease-out rounded-full ${
              isComplete
                ? 'w-full bg-emerald-500'
                : 'bg-gradient-to-r from-sky-400 to-indigo-500'
            }`}
            style={{ width: isComplete ? '100%' : `${numericPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
