import { useCallback, useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/layout/AppShell'
import { getAccessToken } from '../features/auth/authStorage'
import { listAuditLogsRequest } from '../lib/api'

const PAGE_SIZE = 20
const EVENT_TYPES = ['CREATED', 'STATUS_CHANGED', 'APPROVED', 'REJECTED']

function eventBadgeClass(eventType, isDark) {
  const base = 'inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold'

  const map = {
    CREATED: isDark
      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
      : 'border-sky-400/50 bg-sky-100 text-sky-700',
    STATUS_CHANGED: isDark
      ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
      : 'border-violet-400/50 bg-violet-100 text-violet-700',
    APPROVED: isDark
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : 'border-emerald-400/50 bg-emerald-100 text-emerald-700',
    REJECTED: isDark
      ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
      : 'border-rose-400/50 bg-rose-100 text-rose-700',
  }

  return `${base} ${map[eventType] || ''}`
}

function scopeBadgeClass(scope, isDark) {
  if (scope === 'CORPORATE') {
    return isDark
      ? 'inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300'
      : 'inline-flex rounded-full border border-cyan-400/50 bg-cyan-100 px-2 py-1 text-[10px] font-semibold text-cyan-700'
  }

  return isDark
    ? 'inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300'
    : 'inline-flex rounded-full border border-amber-400/50 bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700'
}

function toIsoFromDate(dateText, endOfDay = false) {
  if (!dateText) return ''
  if (endOfDay) return `${dateText}T23:59:59`
  return `${dateText}T00:00:00`
}

export function AuditPage() {
  const [filters, setFilters] = useState({
    documentId: '',
    versionId: '',
    actorUserId: '',
    eventType: '',
    startDate: '',
    endDate: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [page, setPage] = useState(1)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const loadLogs = useCallback(async (targetPage, targetFilters) => {
    const token = getAccessToken()
    if (!token) return

    try {
      setLoading(true)
      setError('')

      const data = await listAuditLogsRequest(token, {
        documentId: targetFilters.documentId,
        versionId: targetFilters.versionId,
        actorUserId: targetFilters.actorUserId,
        eventType: targetFilters.eventType,
        startAt: toIsoFromDate(targetFilters.startDate),
        endAt: toIsoFromDate(targetFilters.endDate, true),
        skip: (targetPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      })

      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar trilha de auditoria.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs(page, appliedFilters)
  }, [page, appliedFilters, loadLogs])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function handleFilterSubmit(event) {
    event.preventDefault()
    setAppliedFilters(filters)
    setPage(1)
  }

  return (
    <AppShell
      title="Auditoria e Compliance"
      subtitle="Consulta rastreavel de eventos por documento, status e responsavel."
    >
      {({ palette, isDark, isAdmin }) => {
        const inputClass = isDark
          ? 'h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none'
          : 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none'

        const secondaryButtonClass = isDark
          ? 'h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800'
          : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100'

        const selectClass = `${inputClass} appearance-none pr-9`

        if (!isAdmin) {
          return (
            <article className={`rounded-2xl border p-4 ${palette.panel}`}>
              <p className="text-sm text-rose-500">Acesso restrito ao perfil Coordenador/Admin.</p>
            </article>
          )
        }

        return (
          <>
            <article className={`rounded-2xl border p-4 ${palette.panel}`}>
              <form className="grid gap-2 md:grid-cols-6" onSubmit={handleFilterSubmit}>
                <input
                  value={filters.documentId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, documentId: event.target.value }))}
                  placeholder="ID Documento"
                  className={inputClass}
                />
                <input
                  value={filters.versionId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, versionId: event.target.value }))}
                  placeholder="ID Versao"
                  className={inputClass}
                />
                <input
                  value={filters.actorUserId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, actorUserId: event.target.value }))}
                  placeholder="ID Usuario"
                  className={inputClass}
                />
                <select
                  value={filters.eventType}
                  onChange={(event) => setFilters((prev) => ({ ...prev, eventType: event.target.value }))}
                  className={selectClass}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                >
                  <option value="">Todos eventos</option>
                  {EVENT_TYPES.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventType}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                  className={inputClass}
                />

                <div className="md:col-span-6 flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const reset = {
                        documentId: '',
                        versionId: '',
                        actorUserId: '',
                        eventType: '',
                        startDate: '',
                        endDate: '',
                      }
                      setFilters(reset)
                      setAppliedFilters(reset)
                      setPage(1)
                    }}
                    className={secondaryButtonClass}
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </form>
            </article>

            {error ? (
              <article className={`rounded-2xl border p-3 ${palette.panel}`}>
                <p className="text-xs text-rose-500">{error}</p>
              </article>
            ) : null}

            <article className={`rounded-2xl border p-4 ${palette.panel}`}>
              <h2 className="text-base font-semibold">Eventos de auditoria</h2>
              {loading ? <p className={`mt-3 text-xs ${palette.textSecondary}`}>Carregando...</p> : null}

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className={palette.textSecondary}>
                      <th className="px-2.5 py-2 font-semibold">Quando</th>
                      <th className="px-2.5 py-2 font-semibold">Evento</th>
                      <th className="px-2.5 py-2 font-semibold">Documento</th>
                      <th className="px-2.5 py-2 font-semibold">Escopo</th>
                      <th className="px-2.5 py-2 font-semibold">Status</th>
                      <th className="px-2.5 py-2 font-semibold">Responsavel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-700/40">
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {new Date(item.occurred_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-2.5 py-2">
                          <span className={eventBadgeClass(item.event_type, isDark)}>{item.event_type}</span>
                        </td>
                        <td className="px-2.5 py-2">
                          <p className="font-semibold">{item.document_code}</p>
                          <p className={palette.textSecondary}>{item.document_title}</p>
                          <p className={palette.textSecondary}>v{item.version_number} (doc {item.document_id})</p>
                        </td>
                        <td className="px-2.5 py-2">
                          <span className={scopeBadgeClass(item.document_scope, isDark)}>{item.document_scope}</span>
                        </td>
                        <td className="px-2.5 py-2">
                          <p>de: {item.previous_status || '-'}</p>
                          <p>para: {item.new_status || '-'}</p>
                        </td>
                        <td className="px-2.5 py-2">
                          <p>{item.actor_user_name}</p>
                          <p className={palette.textSecondary}>ID {item.actor_user_id}</p>
                        </td>
                      </tr>
                    ))}
                    {!loading && items.length === 0 ? (
                      <tr>
                        <td className={`px-2.5 py-6 text-center ${palette.textSecondary}`} colSpan={6}>
                          Nenhum evento encontrado para os filtros informados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className={`text-xs ${palette.textSecondary}`}>Total: {total} eventos</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Anterior
                  </button>
                  <span className={`text-xs ${palette.textSecondary}`}>
                    Pagina {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Proxima
                  </button>
                </div>
              </div>
            </article>
          </>
        )
      }}
    </AppShell>
  )
}
