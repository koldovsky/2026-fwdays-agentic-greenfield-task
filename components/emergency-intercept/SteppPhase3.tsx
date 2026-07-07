'use client'

import { useEmergencyInterceptStore } from '@/store/emergency-intercept'
import { useWizardCopy } from '@/lib/emergency-intercept/use-wizard-copy'

interface Props {
  onSubmit: () => void
  onBack: () => void
}

export function SteppPhase3({ onSubmit, onBack }: Props) {
  const copy = useWizardCopy()
  const phase3Answers = useEmergencyInterceptStore((s) => s.phase3Answers)
  const setPhase3Answers = useEmergencyInterceptStore((s) => s.setPhase3Answers)

  function toggle(value: string) {
    setPhase3Answers(
      phase3Answers.includes(value)
        ? phase3Answers.filter((v) => v !== value)
        : [...phase3Answers, value]
    )
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div className="space-y-1">
        <h1 className="text-[28px] font-bold leading-10 text-ds-text-primary">{copy.phase3.heading}</h1>
        <p className="text-[14px] text-ds-text-secondary">{copy.phase3.subheading}</p>
      </div>

      <ul className="flex flex-col gap-2" role="group" aria-label={copy.phase3.heading}>
        {copy.phase3.options.map((opt) => {
          const checked = phase3Answers.includes(opt.value)
          return (
            <li key={opt.value}>
              <button
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(opt.value)}
                className={`
                  w-full min-h-11 text-left px-5 py-3 rounded-xl border-2 font-medium text-[14px] leading-5
                  flex items-center gap-3 transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-(--ds-accent)/10
                  ${
                    checked
                      ? 'border-accent bg-(--ds-focus-ring) text-ds-text-primary'
                      : 'border-ds-border-medium bg-white text-ds-text-primary hover:border-ds-border-medium'
                  }
                `}
              >
                <span
                  aria-hidden="true"
                  className={`
                    w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center text-xs
                    ${checked ? 'border-accent bg-accent text-white' : 'border-ds-border-medium'}
                  `}
                >
                  {checked ? '✓' : ''}
                </span>
                {opt.label}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex gap-3">
        <button
          onClick={onBack}
          className="
            flex-1 min-h-11 py-4 rounded-2xl border-2 border-ds-border-medium text-ds-text-primary font-bold text-[14px] leading-4.5
            hover:bg-ds-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-border-medium
            transition-colors duration-150
          "
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          className="
            flex-1 min-h-11 py-4 rounded-2xl bg-accent text-white font-bold text-[14px] leading-4.5
            hover:bg-accent-hover active:bg-accent-hover
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
            transition-colors duration-150
          "
        >
          {copy.phase3.submitLabel}
        </button>
      </div>
    </div>
  )
}
