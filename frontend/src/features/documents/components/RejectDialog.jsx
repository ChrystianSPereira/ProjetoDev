export function RejectDialog({ open, reason, onReasonChange, onCancel, onConfirm, submitting }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-slate-950/70" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl">
        <h3 className="text-sm font-semibold">Motivo da reprovacao</h3>
        <p className="mt-1 text-xs text-slate-400">Explique ao autor o que precisa ser ajustado antes da nova submissao.</p>

        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="mt-3 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs outline-none"
          placeholder="Ex: Ajustar referencias normativas e data de vencimento."
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || !reason.trim()}
            className="h-9 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Reprovando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
