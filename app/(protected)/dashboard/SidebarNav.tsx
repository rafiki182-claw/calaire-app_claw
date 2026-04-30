'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const PT_APP_URL = 'https://w421.shinyapps.io/pt_app/'

type NavItem = {
  label: string
  href: string
  tabKey: string | null
  external?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',        href: '/dashboard',                  tabKey: null },
  { label: 'Rondas',        href: '/dashboard?tab=rondas',       tabKey: 'rondas' },
  { label: 'Participantes', href: '/dashboard?tab=participantes', tabKey: 'participantes' },
  { label: 'Resultados',    href: '/dashboard?tab=resultados',   tabKey: 'resultados' },
  { label: 'Herramienta PT', href: PT_APP_URL, tabKey: '__external__', external: true },
]

function NavLink({
  item,
  isActive,
}: {
  item: NavItem
  isActive: boolean
}) {
  const base =
    'relative px-1 py-5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ' +
    'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-t-full after:transition-all after:duration-200'

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={
          `${base} text-[var(--foreground-muted)] hover:text-[var(--foreground)] ` +
          `after:bg-transparent hover:after:bg-[var(--border)] inline-flex items-center gap-1`
        }
      >
        {item.label}
        <span className="text-[9px] opacity-50" aria-hidden="true">↗</span>
        <span className="sr-only">(abre en nueva pestaña)</span>
      </a>
    )
  }

  return (
    <Link
      href={item.href}
      className={
        `${base} ` +
        (isActive
          ? 'text-[var(--foreground)] after:bg-[var(--pt-primary)]'
          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] after:bg-transparent hover:after:bg-[var(--border)]')
      }
    >
      {item.label}
    </Link>
  )
}

function TopNavInner() {
  const pathname   = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  function isActive(item: NavItem): boolean {
    if (item.external) return false
    if (item.tabKey === null) return pathname === '/dashboard' && !tab
    return tab === item.tabKey
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-stretch gap-6 px-6 max-w-screen-2xl mx-auto">
        {/* Brand */}
        <div className="flex items-center pr-6 border-r border-[var(--border-soft)] py-4">
          <span className="text-xs font-bold tracking-[0.18em] uppercase text-[var(--foreground)]">
            CALAIRE
          </span>
          <span
            className="ml-1 text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: 'var(--pt-primary)', color: 'var(--foreground)' }}
          >
            EA
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-stretch gap-5 overflow-x-auto" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.label} item={item} isActive={isActive(item)} />
          ))}
        </nav>
      </div>
    </header>
  )
}

export function Sidebar() {
  return (
    <Suspense>
      <TopNavInner />
    </Suspense>
  )
}

export function MobileNav() {
  return null
}
