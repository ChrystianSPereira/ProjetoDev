import { useCallback, useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/layout/AppShell'
import { getAccessToken } from '../features/auth/authStorage'
import { listAuditLogsRequest, listDocumentsRequest } from '../lib/api'

const PAGE_SIZE = 100
const AUDIT_MONTHS_BACK = 6

function toDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysUntil(dateText) {
  const target = toDate(dateText)
  if (!target) return null

  const now = new Date()
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(target.getFullYear(), target.getMonth(), target.getDate())

  const diffMs = due.getTime() - current.getTime()
  return Math.floor(diffMs / 86400000)
}

async function fetchAllPages(fetchPage) {
  let skip = 0
  let total = 0
  const items = []

  while (true) {
    const data = await fetchPage(skip, PAGE_SIZE)
    const pageItems = data.items || []

    items.push(...pageItems)
    total = Number(data.total || items.length)
    skip += PAGE_SIZE

    if (pageItems.length === 0 || skip >= total) {
      break
    }
  }

  return items
}

function BarRow({ label, value, maxValue, colorClass, textSecondaryClass }) {
  const ratio = maxValue > 0 ? (value / maxValue) * 100 : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={textSecondaryClass}>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800/40">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.max(ratio, value > 0 ? 6 : 0)}%` }}
        />
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, tone, panelClass, textSecondaryClass }) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-500'
      : tone === 'warning'
        ? 'text-amber-500'
        : tone === 'danger'
          ? 'text-rose-500'
          : 'text-cyan-500'

  return (
    <article className={`rounded-2xl border p-4 ${panelClass}`}>
      <p className={`text-xs uppercase tracking-[0.06em] ${textSecondaryClass}`}>{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className={`mt-2 text-xs ${toneClass}`}>{subtitle}</p>
    </article>
  )
}

function DashboardContent({ palette, currentUser, isAdmin, isDark }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState('')
  const [auditUnavailable, setAuditUnavailable] = useState(false)

  const [activeDocs, setActiveDocs] = useState([])
  const [inReviewDocs, setInReviewDocs] = useState([])
  const [draftDocs, setDraftDocs] = useState([])
  const [obsoleteDocs, setObsoleteDocs] = useState([])
  const [auditItems, setAuditItems] = useState([])

  const canViewAudit = isAdmin || currentUser?.role === 'COORDENADOR'

  const loadDashboard = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [active, inReview, drafts, obsolete] = await Promise.all([
        fetchAllPages((skip, limit) => listDocumentsRequest(token, { status: 'ACTIVE', skip, limit })),
        fetchAllPages((skip, limit) => listDocumentsRequest(token, { status: 'IN_REVIEW', skip, limit })),
        fetchAllPages((skip, limit) => listDocumentsRequest(token, { status: 'DRAFT', skip, limit })),
        fetchAllPages((skip, limit) => listDocumentsRequest(token, { status: 'OBSOLETE', skip, limit })),
      ])

      setActiveDocs(active)
      setInReviewDocs(inReview)
      setDraftDocs(drafts)
      setObsoleteDocs(obsolete)

      if (canViewAudit) {
        try {
          const startAt = new Date()
          startAt.setMonth(startAt.getMonth() - (AUDIT_MONTHS_BACK - 1), 1)
          startAt.setHours(0, 0, 0, 0)

          const logs = await fetchAllPages((skip, limit) =>
            listAuditLogsRequest(token, {
              startAt: startAt.toISOString(),
              skip,
              limit,
            }),
          )

          setAuditItems(logs)
          setAuditUnavailable(false)
        } catch {
          setAuditItems([])
          setAuditUnavailable(true)
        }
      } else {
        setAuditItems([])
        setAuditUnavailable(true)
      }

      setLastSync(new Date().toLocaleString('pt-BR'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }, [canViewAudit])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const computed = useMemo(() => {
    const expiringSoon = activeDocs.filter((doc) => {
      const days = daysUntil(doc.expiration_date)
      return days !== null && days >= 0 && days <= 30
    })

    const overdue = activeDocs.filter((doc) => {
      const days = daysUntil(doc.expiration_date)
      return days !== null && days < 0
    })

    const scopeCounts = activeDocs.reduce(
      (acc, doc) => {
        if (doc.scope === 'CORPORATE') acc.corporate += 1
        else acc.local += 1
        return acc
      },
      { corporate: 0, local: 0 },
    )

    const statusCounts = [
      { label: 'Vigente', value: activeDocs.length, colorClass: 'bg-emerald-500' },
      { label: 'Em revisao', value: inReviewDocs.length, colorClass: 'bg-amber-500' },
      { label: 'Rascunho', value: draftDocs.length, colorClass: 'bg-slate-400' },
      { label: 'Obsoleto', value: obsoleteDocs.length, colorClass: 'bg-rose-500' },
    ]

    const expirationBuckets = [
      {
        label: 'Atrasado',
        value: overdue.length,
        colorClass: 'bg-rose-500',
      },
      {
        label: 'Ate 30 dias',
        value: expiringSoon.length,
        colorClass: 'bg-amber-500',
      },
      {
        label: '31 a 90 dias',
        value: activeDocs.filter((doc) => {
          const days = daysUntil(doc.expiration_date)
          return days !== null && days > 30 && days <= 90
        }).length,
        colorClass: 'bg-cyan-500',
      },
      {
        label: 'Acima de 90 dias',
        value: activeDocs.filter((doc) => {
          const days = daysUntil(doc.expiration_date)
          return days !== null && days > 90
        }).length,
        colorClass: 'bg-emerald-500',
      },
    ]

    const soonList = [...expiringSoon]
      .sort((a, b) => (daysUntil(a.expiration_date) ?? 9999) - (daysUntil(b.expiration_date) ?? 9999))
      .slice(0, 5)

    const now = new Date()
    const monthPoints = []

    for (let i = AUDIT_MONTHS_BACK - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthPoints.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }),
        approved: 0,
        rejected: 0,
      })
    }

    const monthMap = new Map(monthPoints.map((point) => [point.key, point]))

    for (const log of auditItems) {
      if (log.event_type !== 'APPROVED' && log.event_type !== 'REJECTED') continue
      const occurred = toDate(log.occurred_at)
      if (!occurred) continue

      const key = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, '0')}`
      const point = monthMap.get(key)
      if (!point) continue

      if (log.event_type === 'APPROVED') point.approved += 1
      if (log.event_type === 'REJECTED') point.rejected += 1
    }

    const approvedTotal = monthPoints.reduce((sum, point) => sum + point.approved, 0)
    const rejectedTotal = monthPoints.reduce((sum, point) => sum + point.rejected, 0)
    const approvalRate = approvedTotal + rejectedTotal > 0
      ? Math.round((approvedTotal / (approvedTotal + rejectedTotal)) * 100)
      : null

    return {
      expiringSoon,
      overdue,
      scopeCounts,
      statusCounts,
      expirationBuckets,
      soonList,
      monthPoints,
      approvedTotal,
      rejectedTotal,
      approvalRate,
    }
  }, [activeDocs, inReviewDocs, draftDocs, obsoleteDocs, auditItems])

  const maxStatus = Math.max(...computed.statusCounts.map((item) => item.value), 1)
  const maxScope = Math.max(computed.scopeCounts.corporate, computed.scopeCounts.local, 1)
  const maxExpiration = Math.max(...computed.expirationBuckets.map((item) => item.value), 1)
  const maxAudit = Math.max(...computed.monthPoints.map((item) => item.approved + item.rejected), 1)

  if (loading) {
    return (
      <article className={`rounded-2xl border p-4 ${palette.panel}`}>
        <p className={`text-sm ${palette.textSecondary}`}>Carregando indicadores...</p>
      </article>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <article className={`rounded-2xl border p-4 ${palette.panel}`}>
          <p className="text-sm text-rose-500">{error}</p>
        </article>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Documentos vigentes"
          value={activeDocs.length}
          subtitle={`${computed.expiringSoon.length} vencendo nos proximos 30 dias`}
          tone="success"
          panelClass={palette.panel}
          textSecondaryClass={palette.textSecondary}
        />
        <KpiCard
          title="Em revisao"
          value={inReviewDocs.length}
          subtitle="Aguardando validacao da coordenacao"
          tone="warning"
          panelClass={palette.panel}
          textSecondaryClass={palette.textSecondary}
        />
        <KpiCard
          title="Rascunhos"
          value={draftDocs.length}
          subtitle="Versoes em elaboracao"
          tone="info"
          panelClass={palette.panel}
          textSecondaryClass={palette.textSecondary}
        />
        <KpiCard
          title="Taxa de aprovacao"
          value={computed.approvalRate === null ? '-' : `${computed.approvalRate}%`}
          subtitle={auditUnavailable ? 'Sem acesso aos logs de auditoria' : 'Base: aprovacoes x reprovacoes'}
          tone={computed.approvalRate !== null && computed.approvalRate >= 70 ? 'success' : 'warning'}
          panelClass={palette.panel}
          textSecondaryClass={palette.textSecondary}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className={`rounded-2xl border p-4 ${palette.panel}`}>
          <h2 className="text-base font-semibold">Distribuicao por status</h2>
          <p className={`mt-1 text-xs ${palette.textSecondary}`}>Panorama atual do ciclo de vida documental.</p>
          <div className="mt-4 space-y-3">
            {computed.statusCounts.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                maxValue={maxStatus}
                colorClass={item.colorClass}
                textSecondaryClass={palette.textSecondary}
              />
            ))}
          </div>
        </article>

        <article className={`rounded-2xl border p-4 ${palette.panel}`}>
          <h2 className="text-base font-semibold">Abrangencia vigente</h2>
          <p className={`mt-1 text-xs ${palette.textSecondary}`}>Comparativo entre documentos Corporativos e Locais vigentes.</p>
          <div className="mt-4 space-y-3">
            <BarRow
              label="Corporativo"
              value={computed.scopeCounts.corporate}
              maxValue={maxScope}
              colorClass="bg-cyan-500"
              textSecondaryClass={palette.textSecondary}
            />
            <BarRow
              label="Local"
              value={computed.scopeCounts.local}
              maxValue={maxScope}
              colorClass="bg-indigo-500"
              textSecondaryClass={palette.textSecondary}
            />
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className={`rounded-2xl border p-4 ${palette.panel}`}>
          <h2 className="text-base font-semibold">Risco de vencimento</h2>
          <p className={`mt-1 text-xs ${palette.textSecondary}`}>Controle preventivo de prazos de validade documental.</p>

          <div className="mt-4 space-y-3">
            {computed.expirationBuckets.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                maxValue={maxExpiration}
                colorClass={item.colorClass}
                textSecondaryClass={palette.textSecondary}
              />
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-700/30 p-3">
            <p className={`text-xs font-semibold uppercase tracking-[0.06em] ${palette.textSecondary}`}>
              Proximos vencimentos
            </p>
            <div className="mt-2 space-y-2 text-xs">
              {computed.soonList.length === 0 ? (
                <p className={palette.textSecondary}>Nenhum documento vence nos proximos 30 dias.</p>
              ) : (
                computed.soonList.map((doc) => (
                  <div key={`${doc.document_id}-${doc.version_id}`} className="flex items-center justify-between gap-3">
                    <span className="truncate font-semibold">{doc.title}</span>
                    <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>{doc.expiration_date}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>

        <article className={`rounded-2xl border p-4 ${palette.panel}`}>
          <h2 className="text-base font-semibold">Tendencia de decisoes</h2>
          <p className={`mt-1 text-xs ${palette.textSecondary}`}>Aprovacoes e reprovacoes por mes (ultimos 6 meses).</p>

          {auditUnavailable ? (
            <div className="mt-4 rounded-xl border border-slate-700/30 p-3">
              <p className={`text-sm ${palette.textSecondary}`}>
                Auditoria indisponivel para este perfil.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-6 gap-2">
              {computed.monthPoints.map((point) => {
                const total = point.approved + point.rejected
                const height = total > 0 ? Math.max((total / maxAudit) * 120, 12) : 6
                const approvedHeight = total > 0 ? (point.approved / total) * height : 0
                const rejectedHeight = total > 0 ? (point.rejected / total) * height : 0

                return (
                  <div key={point.key} className="flex flex-col items-center gap-2">
                    <div className="flex h-32 w-full max-w-10 items-end justify-center rounded-lg border border-slate-700/30 bg-slate-950/30 p-1">
                      <div className="flex w-4 flex-col justify-end overflow-hidden rounded-full">
                        <div className="bg-rose-500" style={{ height: `${rejectedHeight}px` }} />
                        <div className="bg-emerald-500" style={{ height: `${approvedHeight}px` }} />
                      </div>
                    </div>
                    <span className={`text-[11px] ${palette.textSecondary}`}>{point.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Aprovado: {computed.approvedTotal}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Reprovado: {computed.rejectedTotal}
            </span>
          </div>
        </article>
      </div>

      <article className={`rounded-2xl border p-3 ${palette.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={palette.textSecondary}>Atualizado em: {lastSync || '-'}</span>
          <button
            type="button"
            onClick={loadDashboard}
            className={isDark
              ? 'h-8 rounded-lg border border-slate-700 px-3 font-semibold text-slate-200 hover:bg-slate-800'
              : 'h-8 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-100'}
          >
            Atualizar indicadores
          </button>
        </div>
      </article>
    </div>
  )
}

export function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Painel executivo com indicadores operacionais da gestao documental."
    >
      {(shellProps) => <DashboardContent {...shellProps} />}
    </AppShell>
  )
}
