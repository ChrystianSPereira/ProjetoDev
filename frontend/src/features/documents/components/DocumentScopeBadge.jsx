function scopeClass(scope, isDark) {
  if (scope === 'CORPORATE') {
    return isDark
      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
      : 'border-cyan-400/60 bg-cyan-100 text-cyan-700'
  }

  return isDark
    ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
    : 'border-indigo-400/60 bg-indigo-100 text-indigo-700'
}

export function DocumentScopeBadge({ scope, isDark }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${scopeClass(scope, isDark)}`}>
      {scope === 'CORPORATE' ? 'Corporativo' : 'Local'}
    </span>
  )
}
