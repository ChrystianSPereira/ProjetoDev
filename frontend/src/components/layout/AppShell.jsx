import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { clearAccessToken, getAccessToken, getUserProfile, saveUserProfile } from '../../features/auth/authStorage'
import { meRequest } from '../../lib/api'

const THEME_STORAGE_KEY = 'projetodev:login-theme'
const SIDEBAR_COLLAPSED_KEY = 'projetodev:sidebar-collapsed'
const DEFAULT_THEME = 'default'

const OPERATION_MENU = [
  { key: 'dashboard', label: 'Visao Geral', path: '/dashboard' },
  {
    key: 'documentos',
    label: 'Centro de Documentos',
    path: '/documentos',
    children: ['Listagem principal', 'Criacao de rascunho', 'Detalhe e auditoria'],
  },
]

const ADMIN_MENU = [
  { key: 'usuarios', label: 'Usuarios do Sistema', path: '/usuarios' },
  { key: 'auditoria', label: 'Auditoria e Compliance', path: '/auditoria' },
]

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }
  return window.localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME
}

function getInitialSidebarCollapsed() {
  if (typeof window === 'undefined') {
    return true
  }
  const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
  if (stored === null) {
    return true
  }
  return stored === 'true'
}

function isAdminRole(role) {
  return ['COORDENADOR', 'ADMIN', 'ADMINISTRADOR'].includes(role)
}

function SectionTitle({ children, hidden }) {
  if (hidden) return null
  return <p className="mb-2 px-2 text-xs font-semibold tracking-[0.08em] text-slate-400 uppercase">{children}</p>
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M5 5h6v6H5V5Zm8 0h6v6h-6V5ZM5 13h6v6H5v-6Zm8 0h6v6h-6v-6Z" fill="currentColor" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function Chevron({ open, hidden }) {
  if (hidden) return null
  return <span className="text-slate-500">{open ? 'v' : '>'}</span>
}

export function AppShell({ title, subtitle, children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [theme, setTheme] = useState(getInitialTheme)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState(() => new Set(['documentos']))
  const [currentUser, setCurrentUser] = useState(() => getUserProfile())

  const isDark = theme === 'corporate-dark'
  const isAdmin = isAdminRole(currentUser?.role)

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      return
    }

    let isMounted = true
    meRequest(token)
      .then((profile) => {
        if (!isMounted) return
        setCurrentUser(profile)
        saveUserProfile(profile, true)
      })
      .catch(() => {
        if (!isMounted) return
        clearAccessToken()
        navigate('/login', { replace: true })
      })

    return () => {
      isMounted = false
    }
  }, [navigate])

  const palette = useMemo(
    () =>
      isDark
        ? {
            page: 'bg-slate-950 text-slate-100',
            panel: 'bg-slate-900 border-slate-800',
            textSecondary: 'text-slate-400',
            topbar: 'bg-slate-950/80 border-slate-800',
          }
        : {
            page: 'bg-slate-100 text-slate-900',
            panel: 'bg-white border-slate-200',
            textSecondary: 'text-slate-500',
            topbar: 'bg-white/80 border-slate-200',
          },
    [isDark],
  )

  function handleLogout() {
    clearAccessToken()
    navigate('/login', { replace: true })
  }

  function toggleMenu(key) {
    setOpenMenus((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function goTo(path) {
    navigate(path)
    setMobileSidebarOpen(false)
  }

  function renderMenu(items) {
    return items.map((item) => {
      const hasChildren = Array.isArray(item.children) && item.children.length > 0
      const isOpen = openMenus.has(item.key)
      const isActive = !!item.path && location.pathname.startsWith(item.path)

      return (
        <div key={item.key}>
          <button
            type="button"
            title={item.label}
            onClick={() => {
              if (item.path) {
                goTo(item.path)
                return
              }
              if (hasChildren) toggleMenu(item.key)
            }}
            className={`flex w-full items-center rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            } ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
          >
            <span className={`inline-flex items-center ${sidebarCollapsed ? '' : 'gap-2'}`}>
              <span className="text-slate-400">
                <GridIcon />
              </span>
              {!sidebarCollapsed ? item.label : null}
            </span>
            {hasChildren ? <Chevron open={isOpen} hidden={sidebarCollapsed} /> : null}
          </button>

          {hasChildren && isOpen && !sidebarCollapsed ? (
            <div className="ml-5 mt-1 border-l border-slate-800 pl-3">
              {item.children.map((child) => (
                <span
                  key={child}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-400"
                >
                  {child}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )
    })
  }

  return (
    <div className={`theme-${theme} min-h-screen ${palette.page}`}>
      <div className="flex min-h-screen">
        {mobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Fechar menu lateral"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/50 lg:hidden"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-800 bg-slate-950 p-4 text-slate-100 transition-all duration-300 lg:static lg:z-0 lg:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
        >
          <div className={`rounded-xl border border-slate-800 bg-slate-900 p-3 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center lg:justify-center' : 'gap-3'}`}>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-800 text-slate-200" title="DocFlow">
                <GridIcon />
              </div>
              {!sidebarCollapsed ? (
                <div>
                  <p className="text-sm leading-none font-semibold">DocFlow</p>
                  <p className="mt-1 text-xs leading-none text-slate-400">Unimed Campos</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <SectionTitle hidden={sidebarCollapsed}>Operacao</SectionTitle>
              <nav className="space-y-1">{renderMenu(OPERATION_MENU)}</nav>
            </div>

            {isAdmin ? (
              <div>
                <SectionTitle hidden={sidebarCollapsed}>Admin</SectionTitle>
                <nav className="space-y-1">{renderMenu(ADMIN_MENU)}</nav>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className={`sticky top-0 z-10 border-b px-6 py-4 backdrop-blur ${palette.topbar}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen((value) => !value)}
                  className={`rounded-xl border p-2 transition lg:hidden ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Abrir ou fechar menu lateral"
                >
                  <HamburgerIcon />
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  className={`hidden rounded-xl border p-2 transition lg:inline-flex ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title={sidebarCollapsed ? 'Expandir menu lateral' : 'Encolher menu lateral'}
                >
                  <HamburgerIcon />
                </button>

                <div>
                  <h1 className="text-xl font-bold">{title}</h1>
                  <p className={`text-sm ${palette.textSecondary}`}>{subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`inline-flex rounded-xl border p-1 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'}`}>
                  <button
                    type="button"
                    onClick={() => setTheme('default')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      !isDark ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('corporate-dark')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isDark ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Dark
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Sair
                </button>
              </div>
            </div>
          </header>

          <section className="space-y-4 p-6">{children({ isDark, palette, currentUser, isAdmin })}</section>
        </main>
      </div>
    </div>
  )
}
