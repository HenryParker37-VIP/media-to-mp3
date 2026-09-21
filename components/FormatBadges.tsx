'use client';

import React, { useEffect, useState } from 'react';
import { detectBrowserCapabilities, BrowserCapabilities } from '@/lib/conversion/capabilities';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const FormatBadges: React.FC = () => {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null);

  useEffect(() => {
    setCapabilities(detectBrowserCapabilities());
  }, []);

  if (!capabilities) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500 py-1">
        <span>Supports: MP4 • MOV • WEBM • M4A • WAV • MP3</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center space-y-1.5 pt-1">
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
        {capabilities.displayFormats.map((fmt) => (
          <span
            key={fmt.ext}
            title={fmt.note || (fmt.supported ? `${fmt.name} (Supported)` : 'Unsupported codec in this browser')}
            className={`
              inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors
              ${
                fmt.supported
                  ? 'border-neutral-800 bg-neutral-900/80 text-neutral-300'
                  : 'border-neutral-800/50 bg-neutral-950 text-neutral-600 line-through'
              }
            `}
          >
            {fmt.supported ? (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-2.5 h-2.5 text-amber-500/70" />
            )}
            <span>{fmt.ext}</span>
            {fmt.note && (
              <span className="text-[9px] text-amber-400/80 font-normal">(!)</span>
            )}
          </span>
        ))}
      </div>
      {(capabilities.isSafari || capabilities.isIOS) && (
        <p className="text-[11px] text-neutral-500 text-center">
          Safari native decoding: best with MP4, MOV, M4A, WAV, & MP3
        </p>
      )}
    </div>
  );
};
