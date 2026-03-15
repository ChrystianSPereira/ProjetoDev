import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '../components/layout/AppShell'
import { FeedbackBanner } from '../components/ui/FeedbackBanner'
import {
  DataPagination,
  DocumentForm,
  DocumentsFilters,
  DocumentsTable,
  RejectDialog,
} from '../features/documents/components'
import { getAccessToken } from '../features/auth/authStorage'
import {
  approveVersionRequest,
  createDraftRequest,
  listDocumentTypesRequest,
  listDocumentsRequest,
  listSectorsRequest,
  rejectVersionRequest,
  submitDraftRequest,
} from '../lib/api'

const PAGE_SIZE = 10

const INITIAL_FILTERS = {
  q: '',
  sectorId: '',
  documentTypeId: '',
  scope: '',
  status: '',
}

function toActor(currentUser) {
  return {
    id: Number(currentUser?.id || 0),
    role: currentUser?.role || '',
    sector_id: Number(currentUser?.sector_id || 0),
  }
}

function buildInitialFormValues(actorSectorId) {
  return {
    title: '',
    code: '',
    scope: 'LOCAL',
    sectorId: actorSectorId ? String(actorSectorId) : '',
    documentTypeId: '',
    expirationDate: '',
    fileName: '',
    fileUri: '',
  }
}

function DocumentsListContent({ palette, isDark, currentUser }) {
  const navigate = useNavigate()

  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  const [page, setPage] = useState(1)

  const [metadata, setMetadata] = useState({ sectors: [], documentTypes: [] })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createInitialValues, setCreateInitialValues] = useState(buildInitialFormValues(0))
  const [createFormKey, setCreateFormKey] = useState('create-form-default')
  const [createModalMode, setCreateModalMode] = useState('create')
  const [creating, setCreating] = useState(false)

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [submittingVersionId, setSubmittingVersionId] = useState(null)
  const [approvingVersionId, setApprovingVersionId] = useState(null)

  const actor = useMemo(() => toActor(currentUser), [currentUser])
  const isReader = actor.role === 'LEITOR'
  const isAdmin = actor.role === 'ADMINISTRADOR'
  const statusOptions = isReader
    ? [{ value: 'ACTIVE', label: 'Vigente' }]
    : undefined
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const loadMetadata = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    try {
      const [sectors, documentTypes] = await Promise.all([
        listSectorsRequest(token),
        listDocumentTypesRequest(token),
      ])
      setMetadata({ sectors, documentTypes })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar metadados de documentos.')
    }
  }, [])

  const loadList = useCallback(
    async (targetPage, targetFilters) => {
      const token = getAccessToken()
      if (!token) return

      setLoading(true)

      try {
        const data = await listDocumentsRequest(token, {
          q: targetFilters.q,
          sectorId: targetFilters.sectorId,
          documentTypeId: targetFilters.documentTypeId,
          scope: targetFilters.scope,
          status: targetFilters.status,
          skip: (targetPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        })

        setRows(data.items || [])
        setTotal(data.total || 0)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar listagem.')
        setRows([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    if (!actor.role) return
    loadList(page, appliedFilters)
  }, [actor, page, appliedFilters, loadList])

  useEffect(() => {
    if (!isReader) return

    setFilters((previous) => (previous.status === 'ACTIVE' ? previous : { ...previous, status: 'ACTIVE' }))
    setAppliedFilters((previous) => (previous.status === 'ACTIVE' ? previous : { ...previous, status: 'ACTIVE' }))
  }, [isReader])

  function canSubmit(row) {
    if (row.status !== 'DRAFT') return false
    return isAdmin || (actor.role === 'AUTOR' && Number(row.created_by_user_id) === Number(actor.id))
  }

  function canReview(row) {
    if (row.status !== 'IN_REVIEW') return false
    if (isAdmin) return true
    return actor.role === 'COORDENADOR' && Number(row.sector_id) === Number(actor.sector_id)
  }

  function canCreateRevision(row) {
    return row.status === 'ACTIVE' && (actor.role === 'AUTOR' || isAdmin)
  }

  const canCreateDraft = actor.role === 'AUTOR' || isAdmin

  function openCreateModal() {
    if (!canCreateDraft) return
    setError('')
    setFeedback('')
    setCreateModalMode('create')
    setCreateInitialValues(buildInitialFormValues(actor.sector_id))
    setCreateFormKey(`create-form-${actor.id}-${Date.now()}`)
    setCreateModalOpen(true)
  }

  function openRevisionModal(row) {
    setError('')
    setFeedback('')
    setCreateModalMode('revision')
    setCreateInitialValues({
      title: row.title || '',
      code: row.code || '',
      scope: row.scope || 'LOCAL',
      sectorId: row.sector_id ? String(row.sector_id) : String(actor.sector_id || ''),
      documentTypeId: row.document_type_id ? String(row.document_type_id) : '',
      expirationDate: row.expiration_date || '',
      fileName: row.file_name || '',
      fileUri: row.file_uri || '',
    })
    setCreateFormKey(`revision-form-${row.document_id}-${Date.now()}`)
    setCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (creating) return
    setCreateModalOpen(false)
  }

  async function handleSaveDraftFromModal(payload) {
    if (!(actor.role === 'AUTOR' || isAdmin)) {
      setError('Perfil sem permissão para criar rascunhos.')
      return
    }

    const token = getAccessToken()
    if (!token) return

    try {
      setCreating(true)
      setError('')
      setFeedback('')

      await createDraftRequest(token, payload)

      setCreateModalOpen(false)
      setFeedback(createModalMode === 'revision' ? 'Nova versão em rascunho criada com sucesso.' : 'Rascunho criado com sucesso.')
      await loadList(page, appliedFilters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar rascunho.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSubmitReviewFromModal(payload) {
    if (!(actor.role === 'AUTOR' || isAdmin)) {
      setError('Perfil sem permissão para criar e submeter rascunhos.')
      return
    }

    const token = getAccessToken()
    if (!token) return

    try {
      setCreating(true)
      setError('')
      setFeedback('')

      const created = await createDraftRequest(token, payload)
      await submitDraftRequest(token, created.id)

      setCreateModalOpen(false)
      setFeedback(createModalMode === 'revision' ? 'Nova versão criada e enviada para revisão com sucesso.' : 'Rascunho criado e enviado para revisão com sucesso.')
      await loadList(page, appliedFilters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar e submeter rascunho.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSubmit(row) {
    const token = getAccessToken()
    if (!token) return

    try {
      setSubmittingVersionId(row.version_id)
      setError('')
      setFeedback('')
      await submitDraftRequest(token, row.version_id)
      setFeedback('Documento enviado para revisão com sucesso.')
      await loadList(page, appliedFilters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar para revisão.')
    } finally {
      setSubmittingVersionId(null)
    }
  }

  async function handleApprove(row) {
    const token = getAccessToken()
    if (!token) return

    try {
      setApprovingVersionId(row.version_id)
      setError('')
      setFeedback('')
      await approveVersionRequest(token, row.version_id)
      setFeedback('Documento aprovado e publicado como vigente.')
      await loadList(page, appliedFilters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aprovar.')
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
      await rejectVersionRequest(token, rejectTarget.version_id, rejectReason)
      setFeedback('Documento devolvido para ajustes do autor.')
      setRejectTarget(null)
      setRejectReason('')
      await loadList(page, appliedFilters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reprovar.')
    } finally {
      setRejecting(false)
    }
  }

  const inputClass = isDark
    ? 'h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none'
    : 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none'

  const selectClass = `${inputClass} appearance-none pr-9`

  const secondaryButtonClass = isDark
    ? 'h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800'
    : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100'

  const panelClass = `rounded-2xl border p-4 ${palette.panel}`

  const modalCardClass = isDark
    ? 'relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-[0_45px_120px_-40px_rgba(2,6,23,0.95)] backdrop-blur'
    : 'relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-300 bg-white p-6 shadow-[0_35px_80px_-35px_rgba(15,23,42,0.35)]'

  const modalCloseClass = isDark
    ? 'h-9 rounded-xl border border-slate-600 px-3 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-60'
    : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60'

  const modalBadgeClass = isDark
    ? 'inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-cyan-300 uppercase'
    : 'inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-cyan-700 uppercase'

  const isRevisionModal = createModalMode === 'revision'
  const modalBadgeText = isRevisionModal ? 'Versionamento' : 'Criação guiada'
  const modalTitle = isRevisionModal ? 'Nova versão do documento' : 'Novo documento'
  const modalDescription = isRevisionModal
    ? 'Ajuste os dados necessarios e salve uma nova versão sem sobrescrever a vigente.'
    : 'Preencha os campos obrigatórios para criar um rascunho e, opcionalmente, enviar para revisão.'

  return (
    <>
      <article className={panelClass}>
        <div className="mb-3">
          <p className={`text-xs ${palette.textSecondary}`}>
            Busca protegida: por padrao a listagem privilegia sempre a versão Vigente.
          </p>
        </div>

        <DocumentsFilters
          filters={filters}
          sectors={metadata.sectors}
          documentTypes={metadata.documentTypes}
          inputClass={inputClass}
          selectClass={selectClass}
          isDark={isDark}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedFilters(isReader ? { ...filters, status: 'ACTIVE' } : filters)
            setPage(1)
          }}
          statusOptions={statusOptions}
          statusDisabled={isReader}
          onClear={() => {
            const reset = isReader ? { ...INITIAL_FILTERS, status: 'ACTIVE' } : INITIAL_FILTERS
            setFilters(reset)
            setAppliedFilters(reset)
            setPage(1)
          }}
        />
      </article>

      <FeedbackBanner
        variant="success"
        message={feedback}
        title="Operação concluida"
        onClose={() => setFeedback('')}
      />

      <FeedbackBanner
        variant="error"
        message={error}
        title="Falha na operação"
        onClose={() => setError('')}
      />

      <article className={panelClass}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Listagem de documentos</h2>
          {canCreateDraft ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Novo documento
            </button>
          ) : null}
        </div>

        {loading ? <p className={`mb-3 text-xs ${palette.textSecondary}`}>Carregando...</p> : null}

        <DocumentsTable
          rows={rows}
          loading={loading}
          isDark={isDark}
          textSecondaryClass={palette.textSecondary}
          renderActions={(row) => (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/documentos/${row.document_id}`)}
                className={secondaryButtonClass}
              >
                Detalhe
              </button>

              {canSubmit(row) ? (
                <button
                  type="button"
                  onClick={() => handleSubmit(row)}
                  disabled={submittingVersionId === row.version_id}
                  className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingVersionId === row.version_id ? 'Enviando...' : 'Submeter'}
                </button>
              ) : null}

              {canReview(row) ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(row)}
                    disabled={approvingVersionId === row.version_id}
                    className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approvingVersionId === row.version_id ? 'Aprovando...' : 'Aprovar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectTarget(row)
                      setRejectReason('')
                    }}
                    className="h-9 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    Reprovar
                  </button>
                </>
              ) : null}

              {canCreateRevision(row) ? (
                <button
                  type="button"
                  onClick={() => openRevisionModal(row)}
                  className="h-9 rounded-xl border border-amber-500/40 px-3 text-xs font-semibold text-amber-500 hover:bg-amber-500/10"
                >
                  Nova versão
                </button>
              ) : null}
            </div>
          )}
        />

        <DataPagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
          onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          textSecondaryClass={palette.textSecondary}
          buttonClass={secondaryButtonClass}
        />
      </article>

      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px]"
            onClick={closeCreateModal}
          />

          <div className={modalCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/40 pb-4">
              <div>
                <span className={modalBadgeClass}>{modalBadgeText}</span>
                <h3 className="mt-2 text-xl font-semibold">{modalTitle}</h3>
                <p className={`mt-1 text-sm ${palette.textSecondary}`}>
                  {modalDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
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
                revisionMode={isRevisionModal}
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

export function DocumentsListPage() {
  return (
    <AppShell
      title="Documentos"
      subtitle="Listagem principal com busca segura focada na versão vigente de cada documento."
    >
      {(shellProps) => <DocumentsListContent {...shellProps} />}
    </AppShell>
  )
}


































