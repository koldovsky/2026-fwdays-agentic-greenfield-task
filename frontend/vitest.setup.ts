// Vitest global setup (slice 005). Registers @testing-library/jest-dom's DOM matchers
// on Vitest's `expect` and installs an automatic React Testing Library cleanup after
// each test. The Stats tests deliberately assert with plain DOM/Vitest matchers where
// possible (so they do not depend on the jest-dom type augmentation), but the matchers
// are registered here per the slice test-infra plan.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
