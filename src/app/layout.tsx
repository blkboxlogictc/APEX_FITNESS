import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'APEX — AI Personal Trainer',
  description: 'AI-powered personal trainer. Workouts, nutrition, joint health coaching — all personalized to you.',
  manifest: '/manifest.json',
  applicationName: 'APEX',
  keywords: ['AI personal trainer', 'fitness app', 'workout tracker', 'nutrition tracker', 'joint health'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'APEX',
    startupImage: [
      { url: '/splash/iphone-14-pro.png', media: '(device-width: 393px)' },
      { url: '/splash/iphone-14.png', media: '(device-width: 390px)' },
      { url: '/splash/iphone-se.png', media: '(device-width: 375px)' },
    ],
  },
  icons: {
    apple: [
      { url: '/icons/apple-touch-icon.png' },
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
    ],
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-96.png', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#6C63FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
