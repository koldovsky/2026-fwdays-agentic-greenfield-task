// Shims for the Orbit DS: its .jsx primitives ship with .d.ts files that only
// export the *props* interface (e.g. ButtonProps), not the component itself.
// Vite resolves the .jsx at runtime just fine; these declarations tell tsc
// what to expect for each `@ds/**` component the app imports.

import type { ComponentType } from 'react'

declare module '@ds/components/core/Button.jsx' {
  import type { ButtonProps } from '@ds/components/core/Button'
  export const Button: ComponentType<ButtonProps>
}

declare module '@ds/components/core/Card.jsx' {
  import type { CardProps } from '@ds/components/core/Card'
  export const Card: ComponentType<CardProps>
}

declare module '@ds/components/core/DeviceCard.jsx' {
  import type { DeviceCardProps } from '@ds/components/core/DeviceCard'
  export const DeviceCard: ComponentType<DeviceCardProps>
}

declare module '@ds/components/core/IconButton.jsx' {
  import type { IconButtonProps } from '@ds/components/core/IconButton'
  export const IconButton: ComponentType<IconButtonProps>
}

declare module '@ds/components/core/Badge.jsx' {
  import type { BadgeProps } from '@ds/components/core/Badge'
  export const Badge: ComponentType<BadgeProps>
}

declare module '@ds/components/core/ListRow.jsx' {
  import type { ListRowProps } from '@ds/components/core/ListRow'
  export const ListRow: ComponentType<ListRowProps>
}

declare module '@ds/components/forms/Input.jsx' {
  import type { InputProps } from '@ds/components/forms/Input'
  export const Input: ComponentType<InputProps>
}

declare module '@ds/components/forms/Slider.jsx' {
  import type { SliderProps } from '@ds/components/forms/Slider'
  export const Slider: ComponentType<SliderProps>
}

declare module '@ds/components/controls/DPad.jsx' {
  import type { DPadProps } from '@ds/components/controls/DPad'
  export const DPad: ComponentType<DPadProps>
}

declare module '@ds/components/controls/RotaryKnob.jsx' {
  import type { RotaryKnobProps } from '@ds/components/controls/RotaryKnob'
  export const RotaryKnob: ComponentType<RotaryKnobProps>
}

declare module '@ds/components/controls/AppShortcut.jsx' {
  import type { AppShortcutProps } from '@ds/components/controls/AppShortcut'
  export const AppShortcut: ComponentType<AppShortcutProps>
}

declare module '@ds/components/feedback/Modal.jsx' {
  import type { ModalProps } from '@ds/components/feedback/Modal'
  export const Modal: ComponentType<ModalProps>
}

declare module '@ds/components/feedback/Toast.jsx' {
  import type { ToastProps } from '@ds/components/feedback/Toast'
  export const Toast: ComponentType<ToastProps>
}
