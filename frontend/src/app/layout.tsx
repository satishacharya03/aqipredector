import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AetherLab | Air Pollution Level Prediction',
  description: 'Real-time IoT Air Pollution Level Prediction using Machine Learning',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#060e1d] text-[#dde5fb]">
        {children}
      </body>
    </html>
  )
}
