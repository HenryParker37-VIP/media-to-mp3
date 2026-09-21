'use client';

import React from 'react';
import { QualityOption, QUALITY_PRESETS } from '@/lib/types';
import { Sparkles, Radio, Zap } from 'lucide-react';

interface QualitySelectorProps {
  value: QualityOption;
  onChange: (value: QualityOption) => void;
  disabled?: boolean;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const options: QualityOption[] = ['high', 'standard', 'small'];

  const getIcon = (opt: QualityOption) => {
    switch (opt) {
      case 'high':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case 'standard':
        return <Radio className="w-3.5 h-3.5 text-sky-400" />;
      case 'small':
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
          Audio Bitrate Quality
        </label>
        <span className="text-xs font-medium text-neutral-500">
          Output: MP3 • {QUALITY_PRESETS[value].bitrate} kbps
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="MP3 Bitrate Quality"
        className="grid grid-cols-3 gap-2"
      >
        {options.map((opt) => {
          const config = QUALITY_PRESETS[opt];
          const isSelected = value === opt;

          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`
                relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-left transition-all duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900
                ${
                  isSelected
                    ? 'border-sky-500/60 bg-sky-950/30 text-white shadow-lg shadow-sky-500/10'
                    : 'border-neutral-800/80 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center space-x-1.5 mb-1">
                {getIcon(opt)}
                <span className="text-xs font-semibold">{config.label}</span>
              </div>
              <span className="text-[11px] text-neutral-400 tracking-tight font-mono">
                {config.bitrate} kbps
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
