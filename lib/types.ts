export type MediaProviderType = 'youtube' | 'direct' | 'upload' | string;

export interface MediaMetadata {
  id: string;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnailUrl: string;
  provider: MediaProviderType;
  providerName: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  format?: string;
  canDirectDownload: boolean;
  statusNote?: string;
  restrictionReason?: string;
}

export type QualityOption = 'high' | 'standard' | 'small';

export interface QualityConfig {
  id: QualityOption;
  label: string;
  bitrate: number; // kbps
  description: string;
}

export const QUALITY_PRESETS: Record<QualityOption, QualityConfig> = {
  high: {
    id: 'high',
    label: 'High',
    bitrate: 320,
    description: '320 kbps • Studio Audio Quality',
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    bitrate: 192,
    description: '192 kbps • Balanced Quality & Size',
  },
  small: {
    id: 'small',
    label: 'Small',
    bitrate: 128,
    description: '128 kbps • Compact File Size',
  },
};

export type ConversionStage =
  | 'idle'
  | 'analyzing'
  | 'decoding'
  | 'encoding'
  | 'ready'
  | 'complete'
  | 'error';

export interface ConversionState {
  stage: ConversionStage;
  percent?: number; // Only populated when measurably calculated (0-100)
  isIndeterminate: boolean; // True for analyzing / decoding where progress is non-linear/indeterminate
  message: string;
  error?: string;
  downloadUrl?: string;
  outputFileName?: string;
}

export interface AnalyzeResult {
  success: boolean;
  metadata?: MediaMetadata;
  error?: string;
}
