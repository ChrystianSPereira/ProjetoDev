import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AppShell } from '../components/layout/AppShell'
import {
  DocumentForm,
  DocumentScopeBadge,
  DocumentStatusBadge,
  RejectDialog,
} from '../features/documents/components'
import { getAccessToken } from '../features/auth/authStorage'
import {
  approveVersionRequest,
  createDraftRequest,
  getDocumentDetailRequest,
  listDocumentTypesRequest,
  listSectorsRequest,
  rejectVersionRequest,
  submitDraftRequest,
} from '../lib/api'

function toActor(currentUser) {
  return {
    id: Number(currentUser?.id || 0),
    role: currentUser?.role || '',
    sector_id: Number(currentUser?.sector_id || 0),
  }
}

function eventTypeLabel(eventType) {
  const labels = {
    CREATED: 'Criado',
    STATUS_CHANGED: 'Mudanca de status',
    APPROVED: 'Aprovado',
    REJECTED: 'Reprovado',
  }

  return labels[eventType] || eventType
}

function buildRevisionInitialValues(detail, activeVersion) {
  return {
    title: detail?.title || '',
    code: detail?.code || '',
    scope: detail?.scope || 'LOCAL',
    sectorId: detail?.sector_id ? String(detail.sector_id) : '',
    documentTypeId: detail?.document_type_id ? String(detail.document_type_id) : '',
    expirationDate: activeVersion?.expiration_date || '',
    fileName: activeVersion?.file_name || '',
    fileUri: activeVersion?.file_uri || '',
  }
}

function DocumentDetailContent({ palette, isDark, currentUser }) {
  const navigate = useNavigate()
  const { documentId } = useParams()

  const actor = useMemo(() => toActor(currentUser), [currentUser])
  const isAdmin = actor.role === 'ADMINISTRADOR'

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [metadata, setMetadata] = useState({ sectors: [], documentTypes: [] })

  const [submittingVersionId, setSubmittingVersionId] = useState(null)
  const [approvingVersionId, setApprovingVersionId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createInitialValues, setCreateInitialValues] = useState(buildRevisionInitialValues(null, null))
  const [createFormKey, setCreateFormKey] = useState('detail-revision-form-default')
  const [creating, setCreating] = useState(false)

  const panelClass = `rounded-2xl border p-4 ${palette.panel}`
  const secondaryButtonClass = isDark
    ? 'h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800'
    : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100'

  const modalCardClass = isDark
    ? 'relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-[0_45px_120px_-40px_rgba(2,6,23,0.95)] backdrop-blur'
    : 'relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-300 bg-white p-6 shadow-[0_35px_80px_-35px_rgba(15,23,42,0.35)]'

  const modalCloseClass = isDark
    ? 'h-9 rounded-xl border border-slate-600 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-60'
    : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60'

  const modalBadgeClass = isDark
    ? 'inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-amber-300 uppercase'
    : 'inline-flex items-center rounded-full border border-amber-400/40 bg-amber-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-amber-700 uppercase'

  const inputClass = isDark
    ? 'h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none'
    : 'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none'

  const selectClass = `${inputClass} appearance-none pr-9`

  const loadDetail = useCallback(async () => {
    if (!documentId) return

    const token = getAccessToken()
    if (!token) return

    try {
      setLoading(true)
      const data = await getDocumentDetailRequest(token, Number(documentId))
      setDetail(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o detalhe do documento.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    let isMounted = true

    Promise.all([listSectorsRequest(token), listDocumentTypesRequest(token)])
      .then(([sectors, documentTypes]) => {
        if (!isMounted) return
        setMetadata({ sectors, documentTypes })
      })
      .catch(() => {
        if (!isMounted) return
      })

    return () => {
      isMounted = false
    }
  }, [])

  function canSubmit(version) {
    if (version.status !== 'DRAFT') return false
    return isAdmin || (actor.role === 'AUTOR' && Number(version.created_by_user_id) === Number(actor.id))
  }

  function canReview(version) {
    if (version.status !== 'IN_REVIEW') return false
    if (isAdmin) return true
    if (actor.role !== 'COORDENADOR') return false
    return Number(detail?.sector_id) === Number(actor.sector_id)
  }

  function canCreateRevision() {
    return actor.role === 'AUTOR' || isAdmin
  }

  async function handleSubmit(version) {
    const token = getAccessToken()
    if (!token) return

    try {
      setSubmittingVersionId(version.id)
      setError('')
      setFeedback('')
      await submitDraftRequest(token, version.id)
      setFeedback('Versao enviada para revisao com sucesso.')
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao submeter versao.')
    } finally {
      setSubmittingVersionId(null)
    }
  }

  async function handleApprove(version) {
    const token = getAccessToken()
    if (!token) return

    try {
      setApprovingVersionId(version.id)
      setError('')
      setFeedback('')
      await approveVersionRequest(token, version.id)
      setFeedback('Versao aprovada e publicada como vigente.')
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aprovar versao.')
    } finally {
      setApprovingVersionId(null)
    }
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return

    const token = getAccessToken()
    if (!token) return

    try {
      setRejecting(true)
      setError('')
      setFeedback('')
      await rejectVersionRequest(token, rejectTarget.id, rejectReason)
      setFeedback('Versao reprovada e retornada para rascunho.')
      setRejectTarget(null)
      setRejectReason('')
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reprovar versao.')
    } finally {
      setRejecting(false)
    }
  }

  function openRevisionModal() {
    if (!detail) return

    const activeVersion = detail.versions.find((version) => version.id === detail.active_version_id) || detail.versions[0]
    setCreateInitialValues(buildRevisionInitialValues(detail, activeVersion))
    setCreateFormKey(`detail-revision-${detail.document_id}-${Date.now()}`)
    setCreateModalOpen(true)
  }

  function closeRevisionModal() {
    if (creating) return
    setCreateModalOpen(false)
  }

  async function handleSaveDraftFromModal(payload) {
    const token = getAccessToken()
    if (!token) return

    try {
      setCreating(true)
      setError('')
      setFeedback('')

      await createDraftRequest(token, payload)

      setCreateModalOpen(false)
      setFeedback('Nova versao em rascunho criada com sucesso.')
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar nova versao em rascunho.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSubmitReviewFromModal(payload) {
    const token = getAccessToken()
    if (!token) return

    try {
      setCreating(true)
      setError('')
      setFeedback('')

      const created = await createDraftRequest(token, payload)
      await submitDraftRequest(token, created.id)

      setCreateModalOpen(false)
      setFeedback('Nova versao criada e enviada para revisao com sucesso.')
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar e submeter nova versao.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <article className={panelClass}><p className={`text-xs ${palette.textSecondary}`}>Carregando detalhe...</p></article>
  }

  if (!detail) {
    return (
      <article className={panelClass}>
        <p className="text-sm text-rose-500">{error || 'Documento nao encontrado.'}</p>
        <Link to="/documentos" className="mt-3 inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          Voltar para listagem
        </Link>
      </article>
    )
  }

  const activeVersion = detail.versions.find((version) => version.id === detail.active_version_id) || null

  return (
    <>
      <article className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`text-xs ${palette.textSecondary}`}>{detail.code}</p>
            <h2 className="text-lg font-semibold">{detail.title}</h2>
            <p className={`mt-1 text-xs ${palette.textSecondary}`}>
              Setor: {detail.sector_name} | Tipo: {detail.document_type_name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DocumentScopeBadge scope={detail.scope} isDark={isDark} />
            {activeVersion ? <DocumentStatusBadge status={activeVersion.status} isDark={isDark} /> : null}
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/30 p-3">
            <p className={`text-[11px] ${palette.textSecondary}`}>Criado por</p>
            <p className="text-xs font-semibold">{detail.created_by_name}</p>
          </div>

          <div className="rounded-xl border border-slate-700/30 p-3">
            <p className={`text-[11px] ${palette.textSecondary}`}>Ultima atualizacao</p>
            <p className="text-xs font-semibold">{new Date(detail.updated_at).toLocaleString('pt-BR')}</p>
          </div>

          <div className="rounded-xl border border-slate-700/30 p-3">
            <p className={`text-[11px] ${palette.textSecondary}`}>Arquivo vigente</p>
            {activeVersion?.file_uri ? (
              <a href={activeVersion.file_uri} className="text-xs font-semibold text-cyan-500 hover:underline">
                {activeVersion.file_name}
              </a>
            ) : (
              <p className="text-xs font-semibold">Sem versao vigente</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => navigate('/documentos')} className={secondaryButtonClass}>Voltar</button>
        </div>
      </article>

      {feedback ? (
        <article className={panelClass}><p className="text-xs text-emerald-500">{feedback}</p></article>
      ) : null}

      {error ? (
        <article className={panelClass}><p className="text-xs text-rose-500">{error}</p></article>
      ) : null}

      <article className={panelClass}>
                <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Historico de versoes</h3>
          {canCreateRevision() ? (
            <button
              type="button"
              onClick={openRevisionModal}
              className="h-9 rounded-xl bg-amber-500 px-3 text-xs font-semibold text-slate-900 hover:bg-amber-400"
            >
              Criar nova versao em rascunho
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className={palette.textSecondary}>
                <th className="px-2.5 py-2 font-semibold">Versao</th>
                <th className="px-2.5 py-2 font-semibold">Status</th>
                <th className="px-2.5 py-2 font-semibold">Vencimento</th>
                <th className="px-2.5 py-2 font-semibold">Arquivo</th>
                <th className="px-2.5 py-2 font-semibold">Criado por</th>
                <th className="px-2.5 py-2 font-semibold">Aprovado por</th>
                <th className="px-2.5 py-2 font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {detail.versions.map((version) => (
                <tr key={version.id} className="border-t border-slate-700/20">
                  <td className="px-2.5 py-2">v{version.version_number}</td>
                  <td className="px-2.5 py-2"><DocumentStatusBadge status={version.status} isDark={isDark} /></td>
                  <td className="px-2.5 py-2">{version.expiration_date}</td>
                  <td className="px-2.5 py-2">
                    <a href={version.file_uri} className="text-cyan-500 hover:underline">{version.file_name}</a>
                  </td>
                  <td className="px-2.5 py-2">{version.created_by_name}</td>
                  <td className="px-2.5 py-2">{version.approved_by_name || '-'}</td>
                  <td className="px-2.5 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {canSubmit(version) ? (
                        <button
                          type="button"
                          onClick={() => handleSubmit(version)}
                          disabled={submittingVersionId === version.id}
                          className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submittingVersionId === version.id ? 'Enviando...' : 'Submeter'}
                        </button>
                      ) : null}

                      {canReview(version) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(version)}
                            disabled={approvingVersionId === version.id}
                            className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {approvingVersionId === version.id ? 'Aprovando...' : 'Aprovar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(version)
                              setRejectReason('')
                            }}
                            className="h-9 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500"
                          >
                            Reprovar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {detail.versions.length === 0 ? (
                <tr>
                  <td className={`px-2.5 py-5 text-center ${palette.textSecondary}`} colSpan={7}>
                    Nenhuma versao encontrada para este documento.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <article className={panelClass}>
        <h3 className="mb-3 text-base font-semibold">Trilha de auditoria</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className={palette.textSecondary}>
                <th className="px-2.5 py-2 font-semibold">Quando</th>
                <th className="px-2.5 py-2 font-semibold">Evento</th>
                <th className="px-2.5 py-2 font-semibold">Versao</th>
                <th className="px-2.5 py-2 font-semibold">Usuario</th>
                <th className="px-2.5 py-2 font-semibold">Descricao</th>
              </tr>
            </thead>
            <tbody>
              {detail.audits.map((item) => (
                <tr key={item.id} className="border-t border-slate-700/20">
                  <td className="px-2.5 py-2">{new Date(item.occurred_at).toLocaleString('pt-BR')}</td>
                  <td className="px-2.5 py-2">{eventTypeLabel(item.event_type)}</td>
                  <td className="px-2.5 py-2">#{item.version_id}</td>
                  <td className="px-2.5 py-2">{item.actor_user_name}</td>
                  <td className="px-2.5 py-2">{item.description}</td>
                </tr>
              ))}

              {detail.audits.length === 0 ? (
                <tr>
                  <td className={`px-2.5 py-5 text-center ${palette.textSecondary}`} colSpan={5}>
                    Nenhum evento de auditoria encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px]"
            onClick={closeRevisionModal}
          />

          <div className={modalCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/40 pb-4">
              <div>
                <span className={modalBadgeClass}>Versionamento</span>
                <h3 className="mt-2 text-xl font-semibold">Nova versao do documento</h3>
                <p className={`mt-1 text-sm ${palette.textSecondary}`}>
                  Ajuste os dados necessarios e salve uma nova versao sem sobrescrever a vigente.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRevisionModal}
                disabled={creating}
                className={modalCloseClass}
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 max-h-[68vh] overflow-y-auto pr-1">
              <DocumentForm
                key={createFormKey}
                initialValues={createInitialValues}
                sectors={metadata.sectors}
                documentTypes={metadata.documentTypes}
                inputClass={inputClass}
                selectClass={selectClass}
                onSaveDraft={handleSaveDraftFromModal}
                onSubmitReview={handleSubmitReviewFromModal}
                disabled={creating}
                isDark={isDark}
                revisionMode
              />
            </div>
          </div>
        </div>
      ) : null}

      <RejectDialog
        open={!!rejectTarget}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onCancel={() => {
          if (!rejecting) {
            setRejectTarget(null)
            setRejectReason('')
          }
        }}
        onConfirm={handleConfirmReject}
        submitting={rejecting}
      />
    </>
  )
}

export function DocumentDetailPage() {
  return (
    <AppShell
      title="Detalhe do Documento"
      subtitle="Metadados, arquivo, historico de versoes e trilha de auditoria."
    >
      {(shellProps) => <DocumentDetailContent {...shellProps} />}
    </AppShell>
  )
}






