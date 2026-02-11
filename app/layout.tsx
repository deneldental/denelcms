import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import { SonnerToaster } from '@/components/sonner-toaster'
import './globals.css'

export const runtime = 'edge';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mini Clinic Management System',
  description: 'Comprehensive clinic management system for patient care, appointments, and billing',
}

// Perform startup checks (runs once on server startup)
if (typeof window === 'undefined') {
  import('@/lib/startup')
    .then(({ performStartupChecks }) => {
      performStartupChecks()
    })
    .catch((error) => {
      console.error('Startup checks failed:', error)
      // Don't exit process here as it breaks build if env vars aren't present
      // process.exit(1)
    })
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextTopLoader showSpinner={false} />
        {children}
        <SonnerToaster />
      </body>
    </html>
  )
}
