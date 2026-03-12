import { useEffect, useState } from 'react'

import { LoginCard } from '../components/auth/LoginCard'

const HIGHLIGHTS = [
  {
    title: 'Versionamento controlado',
    subtitle: 'Rascunho, revisao, vigente e obsoleto',
  },
  {
    title: 'Aprovacao por alcada',
    subtitle: 'Autor e coordenador por setor',
  },
  {
    title: 'Auditoria e compliance',
    subtitle: 'Registro imutavel de eventos',
  },
]

const THEMES = [
  { id: 'default', label: 'Light' },
  { id: 'corporate-dark', label: 'Dark' },
]

const THEME_STORAGE_KEY = 'projetodev:login-theme'
const DEFAULT_THEME = 'default'

function isValidTheme(value) {
  return THEMES.some((theme) => theme.id === value)
}

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored && isValidTheme(stored) ? stored : DEFAULT_THEME
}

export function LoginPage() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return (
    <div className={`theme-${theme} min-h-screen bg-[linear-gradient(120deg,var(--page-bg-from)_40%,var(--page-bg-to)_100%)] text-(--page-text)`}>
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <aside className="relative overflow-hidden bg-[radial-gradient(80%_100%_at_15%_0%,var(--panel-1)_0%,var(--panel-2)_55%,var(--panel-3)_100%)] p-7 text-white sm:p-10 lg:p-12">
          <div className="absolute inset-0 opacity-15 [background:radial-gradient(circle_at_20%_20%,var(--panel-dot)_0_2px,transparent_2px)] bg-size-[24px_24px]" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 shadow-lg backdrop-blur-sm">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-xs font-black text-slate-700">
                U
              </span>
              <div>
                <p className="text-sm leading-none font-bold">DocFlow</p>
                <p className="mt-1 text-(--panel-subtext) text-[10px] leading-none tracking-[0.2em] uppercase">
                  Campos Group
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-2xl lg:mt-28">
              <p className="text-(--panel-muted) text-xs font-semibold tracking-[0.16em] uppercase">
                Gestao documental corporativa
              </p>
              <h2 className="mt-5 text-4xl leading-tight font-bold sm:text-5xl">
                Controle documental com rastreabilidade e conformidade.
              </h2>
              <p className="mt-6 max-w-xl text-(--panel-subtext) text-base sm:text-lg">
                Centralize documentos por setor, controle versoes com ciclo de vida validado e
                garanta acesso seguro por perfil.
              </p>
            </div>

            <div className="mt-auto grid gap-3 pt-12 sm:grid-cols-3">
              {HIGHLIGHTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border bg-(--panel-card-bg) border-(--panel-card-border) p-4 backdrop-blur-sm"
                >
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-(--panel-subtext) text-[11px] tracking-[0.08em] uppercase">
                    {item.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="relative grid place-items-center p-6 sm:p-10 lg:p-14">
          <div className="absolute top-6 right-6 inline-flex rounded-xl border border-slate-300/70 bg-white/80 p-1 backdrop-blur">
            {THEMES.map((option) => {
              const active = option.id === theme
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <LoginCard />
        </main>
      </div>
    </div>
  )
}
