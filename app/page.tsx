import { MediaConverter } from '@/components/MediaConverter';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden p-4">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/[0.04] rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[128px] pointer-events-none" />

      {/* Main Content */}
      <div className="w-full z-10">
        <MediaConverter />
      </div>
    </main>
  );
}
