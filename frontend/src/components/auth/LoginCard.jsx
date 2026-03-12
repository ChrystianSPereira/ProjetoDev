import { useState } from 'react'

function InputField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  rightAdornment,
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-12 w-full rounded-xl border bg-(--field-bg) border-(--field-border) px-4 pr-14 text-sm text-(--field-text) shadow-[0_0_0_0_rgba(0,0,0,0)] transition-all outline-none placeholder:text-(--field-placeholder) focus:border-(--field-focus) focus:ring-4 focus:ring-(--field-ring)"
          required
        />

        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-(--field-icon) shadow-sm">
            {rightAdornment}
          </span>
        </div>
      </div>
    </div>
  )
}

export function LoginCard({ onSubmit, loading = false, error = '' }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit({ username, password, remember })
  }

  return (
    <div className="w-full max-w-md rounded-3xl border bg-(--card-bg) border-(--card-border) p-7 shadow-[0_30px_70px_-45px_var(--card-shadow)] backdrop-blur">
      <span className="inline-flex items-center gap-2 rounded-full border bg-(--chip-bg) border-(--chip-border) px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-(--chip-text) uppercase">
        <span className="h-2 w-2 rounded-full bg-(--chip-dot)" />
        Acesso corporativo seguro
      </span>

      <h1 className="mt-4 text-3xl leading-tight font-bold text-(--card-title)">
        Seja bem-vindo(a)!
      </h1>
      <p className="mt-2 text-sm text-(--card-text)">
        Faca login para acessar documentos vigentes, fluxo de aprovacao e trilha de auditoria.
      </p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <InputField
          id="username"
          label="Usuario"
          placeholder="Digite seu usuario corporativo"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          rightAdornment={
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2-8 4.5V21h16v-2.5c0-2.5-3.6-4.5-8-4.5Z" />
            </svg>
          }
        />

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
            Senha
          </label>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border bg-(--field-bg) border-(--field-border) px-4 pr-14 text-sm text-(--field-text) shadow-[0_0_0_0_rgba(0,0,0,0)] transition-all outline-none placeholder:text-(--field-placeholder) focus:border-(--field-focus) focus:ring-4 focus:ring-(--field-ring)"
              required
            />

            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-(--field-icon) shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="m4.3 3 16.7 16.7-1.4 1.4-3.2-3.2a12.2 12.2 0 0 1-4.4.8c-5 0-9.3-3.1-11-7a12 12 0 0 1 4.6-5.1L2.9 4.4 4.3 3Zm5 5 6.6 6.6A4 4 0 0 0 9.3 8Zm9.5 5a12 12 0 0 0 3.2-4C20.3 5.1 16 2 11 2a11.5 11.5 0 0 0-3.4.5l1.7 1.7c.6-.1 1.1-.2 1.7-.2 2.8 0 5.4 1.6 6.7 4a8.9 8.9 0 0 1-.9 1.4l2 2Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7Zm0 11a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-(--link) focus:ring-(--link)"
          />
          Manter sessao neste dispositivo
        </label>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 w-full rounded-xl bg-linear-to-r from-(--button-1) to-(--button-2) text-sm font-bold text-white transition-all hover:from-(--button-1-hover) hover:to-(--button-2-hover) disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Entrando...' : 'Entrar na plataforma'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-[11px] text-slate-400">
        <span>v0.1.0 - Plataforma de Gestao Documental</span>
        <span>2026 - Uso interno corporativo</span>
      </div>
    </div>
  )
}
