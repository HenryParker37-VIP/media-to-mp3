import { MediaMetadata } from '../types';
import { MediaProvider } from './types';
import { YouTubeProvider } from './youtube';
import { DirectMediaProvider } from './direct-media';

export class ProviderRegistry {
  private providers: MediaProvider[] = [];

  constructor() {
    // Register default providers in priority order
    this.register(new YouTubeProvider());
    this.register(new DirectMediaProvider());
  }

  register(provider: MediaProvider): void {
    // Avoid duplicate registrations
    this.providers = this.providers.filter((p) => p.id !== provider.id);
    this.providers.push(provider);
  }

  findProvider(url: string): MediaProvider | undefined {
    return this.providers.find((p) => p.canHandle(url));
  }

  async resolveMetadata(url: string): Promise<MediaMetadata> {
    const provider = this.findProvider(url);
    if (!provider) {
      throw new Error(
        'Unsupported URL. Please enter a valid YouTube video link or a direct media link (.mp3, .wav, .mp4, .webm, .m4a).'
      );
    }
    return provider.fetchMetadata(url);
  }

  getAllProviders(): readonly MediaProvider[] {
    return this.providers;
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();
