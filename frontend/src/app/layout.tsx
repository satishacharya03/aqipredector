import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI AQI Monitor Dashboard',
  description: 'Live Hardware & ML Telemetry',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-900 text-slate-100`}>
        {/* Navigation Bar */}
        <nav className="w-full bg-slate-800/50 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Air Quality Matrix
            </h1>
            <div className="flex space-x-6 text-sm font-medium text-slate-300">
              <Link href="/" className="hover:text-white transition-colors">
                Live Feed
              </Link>
              <Link href="/manual" className="hover:text-emerald-400 transition-colors">
                Manual Forecast
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
