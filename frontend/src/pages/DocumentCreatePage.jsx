import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AppShell } from '../components/layout/AppShell'
import { DocumentForm } from '../features/documents/components'
import { getAccessToken } from '../features/auth/authStorage'
import {
  createDraftRequest,
  getDocumentDetailRequest,
  listDocumentTypesRequest,
  listSectorsRequest,
  submitDraftRequest,
} from '../lib/api'

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

function DocumentCreateContent({ palette, isDark, currentUser }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const actor = useMemo(() => toActor(currentUser), [currentUser])

  const [metadata, setMetadata] = useState({ sectors: [], documentTypes: [] })
  const [initialValues, setInitialValues] = useState(buildInitialFormValues(actor.sector_id))
  const [formKey, setFormKey] = useState('form-default')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    let isMounted = true

    Promise.all([listSectorsRequest(token), listDocumentTypesRequest(token)])
      .then(([sectors, documentTypes]) => {
        if (!isMounted) return
        setMetadata({ sectors, documentTypes })
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar metadados de documentos.')
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    const fromDocumentId = searchParams.get('from')

    if (!fromDocumentId) {
      const base = buildInitialFormValues(actor.sector_id)
      setInitialValues(base)
      setFormKey(`form-new-${actor.id}-${Date.now()}`)
      return
    }

    let isMounted = true

    getDocumentDetailRequest(token, Number(fromDocumentId))
      .then((detail) => {
        if (!isMounted) return

        const activeVersion = detail.versions.find((version) => version.id === detail.active_version_id) || detail.versions[0]

        const values = {
          title: detail.title,
          code: detail.code,
          scope: detail.scope,
          sectorId: String(detail.sector_id),
          documentTypeId: String(detail.document_type_id),
          expirationDate: activeVersion?.expiration_date || '',
          fileName: activeVersion?.file_name || '',
          fileUri: activeVersion?.file_uri || '',
        }

        setInitialValues(values)
        setFormKey(`form-revision-${detail.document_id}-${Date.now()}`)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Nao foi possivel carregar documento base para revisao.')
      })

    return () => {
      isMounted = false
    }
  }, [searchParams, actor])

  async function handleSaveDraft(payload) {
    if (actor.role !== 'AUTOR') {
      setError('Apenas o perfil Autor pode criar rascunhos.')
      return
    }

    const token = getAccessToken()
    if (!token) return

    try {
      setSaving(true)
      setError('')
      setFeedback('')

      const created = await createDraftRequest(token, payload)

      setFeedback('Rascunho salvo com sucesso.')
      navigate(`/documentos/${created.document_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar rascunho.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitReview(payload) {
    if (actor.role !== 'AUTOR') {
      setError('Apenas o perfil Autor pode criar e submeter rascunhos.')
      return
    }

    const token = getAccessToken()
    if (!token) return

    try {
      setSaving(true)
      setError('')
      setFeedback('')

      const created = await createDraftRequest(token, payload)
      await submitDraftRequest(token, created.id)

      setFeedback('Rascunho salvo e enviado para revisao com sucesso.')
      navigate(`/documentos/${created.document_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar e submeter documento.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = isDark
    ? 'h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none'
    : 'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none'

  const selectClass = `${inputClass} appearance-none pr-9`
  const panelClass = `rounded-2xl border p-4 ${palette.panel}`

  const backButtonClass = isDark
    ? 'h-9 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800'
    : 'h-9 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100'

  return (
    <>
      <article className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Criacao de documento</h2>
            <p className={`mt-1 text-xs ${palette.textSecondary}`}>
              Preencha metadados obrigatorios: setor, tipo documental e data de vencimento.
            </p>
          </div>

          <Link to="/documentos" className={backButtonClass}>
            Voltar para listagem
          </Link>
        </div>
      </article>

      {feedback ? (
        <article className={panelClass}>
          <p className="text-xs text-emerald-500">{feedback}</p>
        </article>
      ) : null}

      {error ? (
        <article className={panelClass}>
          <p className="text-xs text-rose-500">{error}</p>
        </article>
      ) : null}

      <article className={panelClass}>
        <DocumentForm
          key={formKey}
          initialValues={initialValues}
          sectors={metadata.sectors}
          documentTypes={metadata.documentTypes}
          inputClass={inputClass}
          selectClass={selectClass}
          onSaveDraft={handleSaveDraft}
          onSubmitReview={handleSubmitReview}
          disabled={saving || actor.role !== 'AUTOR'}
          isDark={isDark}
        />
      </article>
    </>
  )
}

export function DocumentCreatePage() {
  return (
    <AppShell
      title="Novo Documento"
      subtitle="Criacao de rascunho com validacao amigavel e envio para revisao."
    >
      {(shellProps) => <DocumentCreateContent {...shellProps} />}
    </AppShell>
  )
}



