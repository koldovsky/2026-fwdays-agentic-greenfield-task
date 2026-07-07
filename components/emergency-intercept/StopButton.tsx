'use client'

import { useEmergencyInterceptStore } from '@/store/emergency-intercept'

export function StopButton() {
  const openModal = useEmergencyInterceptStore((s) => s.openModal)

  return (
    <button
      onClick={openModal}
      aria-label="Emergency stop — open reflection wizard"
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        bg-stop hover:bg-stop-hover active:bg-stop-hover
        text-white font-bold text-[14px] leading-4.5 tracking-widest
        h-12 px-6 rounded-full shadow-xl
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40
      "
    >
      STOP
    </button>
  )
}
