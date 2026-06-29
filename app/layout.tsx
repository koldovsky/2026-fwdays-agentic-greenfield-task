import type { Metadata } from 'next'
import './design-system/styles.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bookshelf',
  description: 'Your reading notes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
