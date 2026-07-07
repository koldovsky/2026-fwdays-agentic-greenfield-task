'use client'

import { DailyCheckIn } from './DailyCheckIn'
import { SuccessStoryForm } from './SuccessStoryForm'
import { WinsList } from './WinsList'

export function ProgressLoggingPanel() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <DailyCheckIn />
      <SuccessStoryForm />
      <WinsList />
    </div>
  )
}
