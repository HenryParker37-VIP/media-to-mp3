import { MediaMetadata } from '../types';

export interface MediaProvider {
  readonly id: string;
  readonly name: string;
  canHandle(url: string): boolean;
  fetchMetadata(url: string): Promise<MediaMetadata>;
}
