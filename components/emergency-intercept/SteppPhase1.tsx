'use client'

import { useEmergencyInterceptStore, type Emotion } from '@/store/emergency-intercept'
import { useWizardCopy } from '@/lib/emergency-intercept/use-wizard-copy'

interface Props {
  onNext: () => void
}

export function SteppPhase1({ onNext }: Props) {
  const copy = useWizardCopy()
  const phase1Answer = useEmergencyInterceptStore((s) => s.phase1Answer)
  const setPhase1Answer = useEmergencyInterceptStore((s) => s.setPhase1Answer)

  return (
    <div className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div className="space-y-1">
        <h1 className="text-[28px] font-bold leading-10 text-ds-text-primary">{copy.phase1.heading}</h1>
        <p className="text-[14px] text-ds-text-secondary">{copy.phase1.subheading}</p>
      </div>

      <ul className="flex flex-col gap-3" role="radiogroup" aria-label={copy.phase1.heading}>
        {copy.phase1.options.map((opt) => {
          const selected = phase1Answer === opt.value
          return (
            <li key={opt.value}>
              <button
                role="radio"
                aria-checked={selected}
                onClick={() => setPhase1Answer(opt.value as Emotion)}
                className={`
                  w-full min-h-11 text-left px-5 py-4 rounded-2xl border-2 font-medium text-[16px] leading-6
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-(--ds-accent)/10
                  ${
                    selected
                      ? 'border-accent bg-(--ds-focus-ring) text-ds-text-primary'
                      : 'border-ds-border-medium bg-white text-ds-text-primary hover:border-ds-border-medium'
                  }
                `}
              >
                {opt.label}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto">
        <button
          onClick={onNext}
          disabled={!phase1Answer}
          aria-disabled={!phase1Answer}
          className="
            w-full min-h-11 py-4 rounded-2xl bg-accent text-white font-bold text-[14px] leading-4.5
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:bg-accent-hover active:bg-accent-hover
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
            transition-colors duration-150
          "
        >
          {copy.phase1.nextLabel}
        </button>
      </div>
    </div>
  )
}
