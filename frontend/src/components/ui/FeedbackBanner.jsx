function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="5.5" r="1" fill="currentColor" />
    </svg>
  )
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m6.5 10 2.2 2.3 4.8-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path d="M10 3.5 17 16.5H3L10 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 7.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13.3" r="1" fill="currentColor" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m7 7 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const VARIANT_STYLES = {
  info: {
    wrapper: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
    icon: InfoIcon,
    title: 'Informação',
  },
  success: {
    wrapper: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
    icon: SuccessIcon,
    title: 'Sucesso',
  },
  warning: {
    wrapper: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
    icon: WarningIcon,
    title: 'Atenção',
  },
  error: {
    wrapper: 'border-rose-500/35 bg-rose-500/10 text-rose-200',
    icon: ErrorIcon,
    title: 'Erro',
  },
}

export function FeedbackBanner({ variant = 'info', message = '', title = '', onClose = null, compact = false }) {
  if (!message) return null

  const selected = VARIANT_STYLES[variant] || VARIANT_STYLES.info
  const Icon = selected.icon

  return (
    <article
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3 py-2 ${selected.wrapper} ${compact ? 'text-xs' : 'text-sm'}`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 opacity-90">
          <Icon />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase opacity-90">{title || selected.title}</p>
          <p className="mt-0.5 leading-relaxed">{message}</p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-current/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-90 transition hover:bg-black/10"
            aria-label="Fechar mensagem"
          >
            Fechar
          </button>
        ) : null}
      </div>
    </article>
  )
}
