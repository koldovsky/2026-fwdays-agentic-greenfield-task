import { MetricsPanel } from '@/components/dashboard/MetricsPanel'
import { TopTasksPanel } from '@/components/dashboard/TopTasksPanel'
import { StoryCarousel } from '@/components/dashboard/StoryCarousel'
import { ProgressLoggingPanel } from '@/components/progress-logging/ProgressLoggingPanel'
import { ToneModeSwitcher } from '@/components/ToneModeSwitcher'

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-ds-surface min-h-screen font-sans">
      <main className="w-full max-w-lg px-4 py-12 flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-10 text-ds-text-primary">Bye Binge</h1>
            <p className="text-[14px] text-ds-text-secondary mt-1">Your daily progress</p>
          </div>
          <ToneModeSwitcher />
        </header>
        <MetricsPanel />
        <TopTasksPanel />
        <StoryCarousel />
        <ProgressLoggingPanel />
      </main>
    </div>
  )
}
