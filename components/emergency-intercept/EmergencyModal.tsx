'use client'

import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useEmergencyInterceptStore } from '@/store/emergency-intercept'
import { useExitGuard } from '@/lib/emergency-intercept/use-exit-guard'
import { useWizardCopy } from '@/lib/emergency-intercept/use-wizard-copy'

// Code-split — modal shell mounts synchronously; wizard content loads lazily.
const SteppWizard = lazy(() =>
  import('./SteppWizard').then((m) => ({ default: m.SteppWizard }))
)

export function EmergencyModal() {
  const isOpen = useEmergencyInterceptStore((s) => s.isEmergencyModalOpen)
  const closeModal = useEmergencyInterceptStore((s) => s.closeModal)
  const { isWizardInProgress } = useExitGuard()
  const copy = useWizardCopy()
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // Focus trap: cycle Tab within modal when open
  useEffect(() => {
    if (!isOpen) return

    firstFocusableRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleCloseRequest()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'))

      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isWizardInProgress])

  // Mark background inert when modal is open.
  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    if (isOpen) {
      main.setAttribute('inert', '')
    } else {
      main.removeAttribute('inert')
    }
  }, [isOpen])

  function handleCloseRequest() {
    if (isWizardInProgress) {
      setShowExitConfirm(true)
    } else {
      closeModal()
    }
  }

  function handleConfirmExit() {
    setShowExitConfirm(false)
    closeModal()
  }

  function handleCancelExit() {
    setShowExitConfirm(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.modalTitle}
      ref={modalRef}
      style={{
        display: isOpen ? 'flex' : 'none',
        height: '100dvh',
      }}
      className="fixed inset-0 z-100 flex-col bg-white overflow-y-auto"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-ds-border-light">
        <span className="text-[14px] font-semibold leading-4.5 text-accent uppercase tracking-widest">
          {copy.modalTitle}
        </span>
        <button
          ref={firstFocusableRef}
          onClick={handleCloseRequest}
          aria-label="Close reflection wizard"
          className="
            min-h-11 min-w-11 p-2 rounded-full text-ds-text-secondary hover:text-ds-text-primary
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
          "
        >
          ✕
        </button>
      </div>

      {/* Wizard content — lazy-loaded after first open */}
      <div className="flex-1 flex flex-col">
        <Suspense fallback={null}>
          <SteppWizard />
        </Suspense>
      </div>

      {/* Inline exit confirmation overlay */}
      {showExitConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="exit-heading"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6"
        >
          <div className="bg-white rounded-xl border border-ds-border-light shadow-card-hover p-6 w-full max-w-sm">
            <h2 id="exit-heading" className="text-xl font-semibold leading-7 text-ds-text-primary mb-2">
              {copy.exitConfirm.heading}
            </h2>
            <p className="text-[14px] text-ds-text-secondary mb-6">{copy.exitConfirm.body}</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmExit}
                className="
                  flex-1 min-h-11 py-3 rounded-xl bg-accent text-white font-semibold text-[14px] leading-4.5
                  hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
                "
              >
                {copy.exitConfirm.confirmLabel}
              </button>
              <button
                onClick={handleCancelExit}
                className="
                  flex-1 min-h-11 py-3 rounded-xl border border-ds-border-medium text-ds-text-primary font-semibold text-[14px] leading-4.5
                  hover:bg-ds-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-border-medium
                "
              >
                {copy.exitConfirm.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
