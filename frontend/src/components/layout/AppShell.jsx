import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { clearAccessToken, getAccessToken, getUserProfile, saveUserProfile } from '../../features/auth/authStorage'
import { changePasswordRequest, meRequest } from '../../lib/api'

const THEME_STORAGE_KEY = 'projetodev:login-theme'
const SIDEBAR_COLLAPSED_KEY = 'projetodev:sidebar-collapsed'
const DEFAULT_THEME = 'default'

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
  return role === 'ADMINISTRADOR'
}

function canAccessAudit(role) {
  return role === 'COORDENADOR' || role === 'ADMINISTRADOR'
}

function roleLabel(role) {
  const labels = {
    ADMINISTRADOR: 'Administrador',
    COORDENADOR: 'Coordenador/Aprovador',
    AUTOR: 'Autor',
    LEITOR: 'Leitor',
  }
  return labels[role] || role || 'Sem perfil'
}

function buildOperationMenu() {
  return [
    { key: 'dashboard', label: 'Visao Geral', path: '/dashboard' },
    { key: 'documentos', label: 'Centro de Documentos', path: '/documentos' },
  ]
}

function buildAdminMenu(role) {
  const items = []

  if (isAdminRole(role)) {
    items.push({ key: 'setores', label: 'Setores da Empresa', path: '/setores' })
    items.push({ key: 'usuários', label: 'Usuários do Sistema', path: '/usuarios' })
  }

  if (canAccessAudit(role)) {
    items.push({ key: 'auditoria', label: 'Auditoria e Compliance', path: '/auditoria' })
  }

  return items
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.314 0-6 2.015-6 4.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5C18 16.015 15.314 14 12 14Z"
        fill="currentColor"
      />
    </svg>
  )
}

function DotsVerticalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  )
}


function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M14.5 5a4.5 4.5 0 1 0 3.2 7.7l3.6 3.6h1.7v-1.7h-1.7v-1.7h-1.7v-1.7h-1.7l-1-1a4.5 4.5 0 0 0-2.4-7.2Zm-2.7 4.5a1.8 1.8 0 1 1 3.5 0 1.8 1.8 0 0 1-3.5 0Z" fill="currentColor" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H6V6h4V4Zm7.3 4.3-1.4 1.4 1.6 1.6H9v2h8.5l-1.6 1.6 1.4 1.4L21.3 12l-4-3.7Z" fill="currentColor" />
    </svg>
  )
}
function PasswordCheckIcon({ status }) {
  if (status === 'ok') {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600/20 text-emerald-400" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (status === 'error') {
    return <span className="h-4 w-4 rounded-full border border-rose-500 bg-rose-500/10" aria-hidden="true" />
  }

  return <span className="h-4 w-4 rounded-full border border-slate-500 bg-slate-500/10" aria-hidden="true" />
}

function validatePasswordInput(form) {
  if (!form.currentPassword.trim()) {
    return 'Informe a senha atual.'
  }
  if (form.newPassword.length < 8) {
    return 'A nova senha deve ter pelo menos 8 caracteres.'
  }
  if (!/[A-Z]/.test(form.newPassword) || !/[a-z]/.test(form.newPassword) || !/\d/.test(form.newPassword) || !/[^A-Za-z0-9]/.test(form.newPassword)) {
    return 'A nova senha deve conter maiuscula, minuscula, numero e caractere especial.'
  }
  if (form.newPassword !== form.confirmNewPassword) {
    return 'A confirmação da nova senha não confere.'
  }
  if (form.newPassword === form.currentPassword) {
    return 'A nova senha deve ser diferente da senha atual.'
  }
  return ''
}

export function AppShell({ title, subtitle, children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [theme, setTheme] = useState(getInitialTheme)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => getUserProfile())

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const profileMenuRef = useRef(null)

  const isDark = theme === 'corporate-dark'
  const role = currentUser?.role || ''
  const isAdmin = isAdminRole(role)
  const hasAuditAccess = canAccessAudit(role)
  const canManageUsers = isAdminRole(role)

  const operationMenu = useMemo(() => buildOperationMenu(), [])
  const adminMenu = useMemo(() => buildAdminMenu(role), [role])

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

    useEffect(() => {
    function handlePointerDown(event) {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])
function handleLogout() {
    clearAccessToken()
    navigate('/login', { replace: true })
  }

  function goTo(path) {
    navigate(path)
    setMobileSidebarOpen(false)
  }

  function openPasswordModal() {
    setProfileMenuOpen(false)
    setPasswordError('')
    setPasswordSuccess('')
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    })
    setShowPasswordModal(true)
  }

  async function handleSubmitPassword(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    const localError = validatePasswordInput(passwordForm)
    if (localError) {
      setPasswordError(localError)
      return
    }

    const token = getAccessToken()
    if (!token) {
      handleLogout()
      return
    }

    try {
      setPasswordLoading(true)
      const response = await changePasswordRequest(token, {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        confirm_new_password: passwordForm.confirmNewPassword,
      })
      setPasswordSuccess(response?.message || 'Senha atualizada com sucesso.')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
    } catch (error) {
      setPasswordError(error.message || 'Falha ao atualizar senha.')
    } finally {
      setPasswordLoading(false)
    }
  }
  function renderMenu(items) {
    return items.map((item) => {
      const isActive = !!item.path && location.pathname.startsWith(item.path)

      return (
        <div key={item.key}>
          <button
            type="button"
            title={item.label}
            onClick={() => {
              if (item.path) {
                goTo(item.path)
              }
            }}
            className={`flex w-full items-center rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              sidebarCollapsed ? 'justify-center' : 'justify-start'
            } ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
          >
            <span className={`inline-flex items-center ${sidebarCollapsed ? '' : 'gap-2'}`}>
              <span className="text-slate-400">
                <GridIcon />
              </span>
              {!sidebarCollapsed ? item.label : null}
            </span>
          </button>
        </div>
      )
    })
  }

  const currentUserLabel = currentUser?.name || 'Usuário'
  const currentRoleLabel = roleLabel(currentUser?.role)

  const passwordCriteria = useMemo(
    () => [
      {
        label: 'Minimo de 8 caracteres',
        status: passwordForm.newPassword.length === 0 ? 'neutral' : passwordForm.newPassword.length >= 8 ? 'ok' : 'error',
      },
      {
        label: 'Pelo menos 1 letra maiuscula',
        status: passwordForm.newPassword.length === 0 ? 'neutral' : /[A-Z]/.test(passwordForm.newPassword) ? 'ok' : 'error',
      },
      {
        label: 'Pelo menos 1 letra minuscula',
        status: passwordForm.newPassword.length === 0 ? 'neutral' : /[a-z]/.test(passwordForm.newPassword) ? 'ok' : 'error',
      },
      {
        label: 'Pelo menos 1 numero',
        status: passwordForm.newPassword.length === 0 ? 'neutral' : /\d/.test(passwordForm.newPassword) ? 'ok' : 'error',
      },
      {
        label: 'Pelo menos 1 caractere especial',
        status:
          passwordForm.newPassword.length === 0
            ? 'neutral'
            : /[^A-Za-z0-9]/.test(passwordForm.newPassword)
              ? 'ok'
              : 'error',
      },
      {
        label: 'Confirmação igual a nova senha',
        status:
          passwordForm.newPassword.length === 0 && passwordForm.confirmNewPassword.length === 0
            ? 'neutral'
            : passwordForm.confirmNewPassword.length > 0 && passwordForm.confirmNewPassword === passwordForm.newPassword
              ? 'ok'
              : 'error',
      },
    ],
    [passwordForm.newPassword, passwordForm.confirmNewPassword],
  )

  return (
    <div className={`theme-${theme} h-screen overflow-hidden ${palette.page}`}>
      <div className="flex h-full min-h-0">
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
          } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} flex flex-col overflow-hidden`}
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

          <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 overscroll-contain">
            <div>
              <SectionTitle hidden={sidebarCollapsed}>Operação</SectionTitle>
              <nav className="space-y-1">{renderMenu(operationMenu)}</nav>
            </div>

            {adminMenu.length > 0 ? (
              <div>
                <SectionTitle hidden={sidebarCollapsed}>Admin</SectionTitle>
                <nav className="space-y-1">{renderMenu(adminMenu)}</nav>
              </div>
            ) : null}
          </div>

          <div className="relative mt-4" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((value) => !value)}
              className={`w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-left transition hover:bg-slate-800/80 ${sidebarCollapsed ? 'text-center' : ''}`}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
            >
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
                <div className="inline-flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300">
                    <UserIcon />
                  </span>
                  {!sidebarCollapsed ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white" title={currentUserLabel}>{currentUserLabel}</p>
                      <p className="truncate text-xs text-slate-400" title={currentUser?.email || ''}>{currentUser?.email || currentRoleLabel}</p>
                    </div>
                  ) : null}
                </div>
                {!sidebarCollapsed ? (
                  <span className={`grid h-7 w-7 place-items-center rounded-md border text-slate-300 transition ${profileMenuOpen ? 'border-slate-500 bg-slate-700' : 'border-slate-700 bg-slate-800'}`} aria-hidden="true">
                    <DotsVerticalIcon />
                  </span>
                ) : null}
              </div>
            </button>

            {profileMenuOpen ? (
              <div className="absolute right-0 bottom-full z-30 mb-2 w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                <div className="border-b border-slate-700 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-white" title={currentUserLabel}>{currentUserLabel}</p>
                  <p className="truncate text-xs text-slate-400" title={currentRoleLabel}>{currentRoleLabel}</p>
                </div>


                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="flex w-full items-center gap-2 border-t border-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  <KeyIcon />
                  Trocar senha
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 border-t border-slate-800 px-3 py-2 text-left text-sm text-rose-300 hover:bg-slate-800"
                >
                  <LogoutIcon />
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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


              </div>
            </div>
          </header>

          <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 overscroll-contain">
            {children({
              isDark,
              palette,
              currentUser,
              isAdmin,
              canAccessAudit: hasAuditAccess,
              canManageUsers,
            })}
          </section>
        </main>
      </div>

      {showPasswordModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className={`w-full max-w-lg rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'}`}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Trocar senha</h2>
                <p className={`text-sm ${palette.textSecondary}`}>Atualize sua senha com seguranca.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmitPassword} className="space-y-3">
              <label className="block">
                <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.08em] ${palette.textSecondary}`}>Senha atual</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
                    isDark
                      ? 'border-slate-700 bg-slate-950 text-slate-100 focus:border-sky-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                  }`}
                />
              </label>

              <label className="block">
                <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.08em] ${palette.textSecondary}`}>Nova senha</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
                    isDark
                      ? 'border-slate-700 bg-slate-950 text-slate-100 focus:border-sky-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                  }`}
                />
              </label>

              <label className="block">
                <span className={`mb-1 block text-xs font-semibold uppercase tracking-[0.08em] ${palette.textSecondary}`}>Confirmar nova senha</span>
                <input
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
                    isDark
                      ? 'border-slate-700 bg-slate-950 text-slate-100 focus:border-sky-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600'
                  }`}
                />
              </label>

              <div className={`rounded-xl border px-3 py-2.5 text-xs ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`mb-2 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Criterios da nova senha</p>
                <div className="space-y-1.5">
                  {passwordCriteria.map((criterion) => (
                    <div key={criterion.label} className="flex items-center gap-2">
                      <PasswordCheckIcon status={criterion.status} />
                      <span
                        className={`text-xs ${
                          criterion.status === 'ok'
                            ? 'text-emerald-500'
                            : criterion.status === 'error'
                              ? 'text-rose-500'
                              : isDark
                                ? 'text-slate-400'
                                : 'text-slate-500'
                        }`}
                      >
                        {criterion.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {passwordError ? <p className="text-sm text-rose-500">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-sm text-emerald-500">{passwordSuccess}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {passwordLoading ? 'Salvando...' : 'Atualizar senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
















