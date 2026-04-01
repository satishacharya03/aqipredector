'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wind } from 'lucide-react'

export default function NavBar() {
  const path = usePathname()

  const links = [
    { href: '/', label: 'Live Monitor' },
    { href: '/manual', label: 'AI Forecast' },
  ]

  return (
    <nav className="relative z-50 w-full border-b border-white/[0.04]"
         style={{ backdropFilter: 'blur(24px)', background: 'rgba(2,8,23,0.8)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Wind className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white">AQI Neural</span>
            <span className="ml-1.5 text-[10px] font-semibold tracking-widest text-teal-400 uppercase">Monitor</span>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {links.map(({ href, label }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-teal-500/20 text-teal-300 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400"/>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
          </span>
          System Online
        </div>

      </div>
    </nav>
  )
}
