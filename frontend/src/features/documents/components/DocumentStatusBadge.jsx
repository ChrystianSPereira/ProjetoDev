const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Em Revisao',
  ACTIVE: 'Vigente',
  OBSOLETE: 'Obsoleto',
}

function statusClass(status, isDark) {
  if (status === 'ACTIVE') {
    return isDark
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : 'border-emerald-400/60 bg-emerald-100 text-emerald-700'
  }

  if (status === 'IN_REVIEW') {
    return isDark
      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
      : 'border-amber-400/60 bg-amber-100 text-amber-700'
  }

  if (status === 'OBSOLETE') {
    return isDark
      ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
      : 'border-rose-400/60 bg-rose-100 text-rose-700'
  }

  return isDark
    ? 'border-slate-500/40 bg-slate-500/15 text-slate-200'
    : 'border-slate-400/60 bg-slate-100 text-slate-700'
}

export function DocumentStatusBadge({ status, isDark }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass(status, isDark)}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
