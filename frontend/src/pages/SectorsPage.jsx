import { useCallback, useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/layout/AppShell'
import { FeedbackBanner } from '../components/ui/FeedbackBanner'
import { Skeleton } from '../components/ui/Skeleton'
import { getAccessToken } from '../features/auth/authStorage'
import {
  createSectorRequest,
  deleteSectorRequest,
  listSectorsRequest,
  updateSectorRequest,
} from '../lib/api'

const PAGE_SIZE = 10

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 20h16v-2H4v2Zm2-4h3v-3H6v3Zm0-5h3V8H6v3Zm5 5h3v-3h-3v3Zm0-5h3V8h-3v3Zm5 5h3v-8h-3v8Z" fill="currentColor" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="m21 21-4.2-4.2m1.2-4.3a6.6 6.6 0 1 1-13.2 0 6.6 6.6 0 0 1 13.2 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function Modal({ isOpen, title, description, onClose, children, isDark }) {
  if (!isOpen) return null

  const cardClass = isDark
    ? 'relative z-10 w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl'
    : 'relative z-10 w-full max-w-lg rounded-3xl border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl'

  const closeClass = isDark
    ? 'rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800'
    : 'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-slate-950/75" onClick={onClose} />
      <div className={cardClass}>
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-700/30 pb-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className={closeClass}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SectorsPage() {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)

  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [createName, setCreateName] = useState('')
  const [editName, setEditName] = useState('')
  const [editSectorId, setEditSectorId] = useState(null)

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadSectors = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    try {
      setLoading(true)
      setError('')
      const data = await listSectorsRequest(token)
      setSectors(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar setores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSectors()
  }, [loadSectors])

  const filteredSectors = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase()
    if (!q) return sectors
    return sectors.filter((sector) => sector.name.toLowerCase().includes(q))
  }, [sectors, appliedQuery])

  const total = filteredSectors.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredSectors.slice(start, start + PAGE_SIZE)
  }, [filteredSectors, page])

  function openCreateModal() {
    setError('')
    setFeedback('')
    setCreateName('')
    setIsCreateModalOpen(true)
  }

  function openEditModal(sector) {
    setError('')
    setFeedback('')
    setEditSectorId(sector.id)
    setEditName(sector.name)
    setIsEditModalOpen(true)
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    const token = getAccessToken()
    if (!token) return

    try {
      setCreating(true)
      setFeedback('')
      setError('')

      await createSectorRequest(token, { name: createName.trim() })

      setFeedback('Setor criado com sucesso.')
      setIsCreateModalOpen(false)
      await loadSectors()
      setPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar setor.')
    } finally {
      setCreating(false)
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    const token = getAccessToken()
    if (!token || !editSectorId) return

    try {
      setUpdating(true)
      setFeedback('')
      setError('')

      await updateSectorRequest(token, editSectorId, { name: editName.trim() })

      setFeedback('Setor atualizado com sucesso.')
      setIsEditModalOpen(false)
      await loadSectors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar setor.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleConfirmDelete() {
    const token = getAccessToken()
    if (!token || !deleteTarget) return

    try {
      setDeleting(true)
      setFeedback('')
      setError('')

      await deleteSectorRequest(token, deleteTarget.id)

      setFeedback('Setor excluido com sucesso.')
      setDeleteTarget(null)
      await loadSectors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir setor.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell title="Gestão de Setores" subtitle="Cadastro e manutenção dos setores da empresa.">
      {({ palette, canManageUsers, isDark }) => {
        const inputClass = isDark
          ? 'h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none'
          : 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none'

        const secondaryButtonClass = isDark
          ? 'h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800'
          : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100'

        const tableRowClass = isDark ? 'border-slate-700/40 hover:bg-slate-800/30' : 'border-slate-200 hover:bg-slate-50'

        if (!canManageUsers) {
          return (
            <article className={`rounded-2xl border p-4 ${palette.panel}`}>
              <p className="text-sm text-rose-500">Acesso restrito ao perfil Administrador.</p>
            </article>
          )
        }

        return (
          <>
            <article className={`rounded-2xl border p-4 ${palette.panel}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-cyan-300 uppercase">
                  <BuildingIcon />
                  Administração de setores
                </div>
              </div>

              <form
                className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  setAppliedQuery(query)
                  setPage(1)
                }}
              >
                <div className="relative">
                  <span className={`pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <SearchIcon />
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar setor por nome"
                    className={`${inputClass} w-full pl-10`}
                  />
                </div>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  Filtrar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setAppliedQuery('')
                    setPage(1)
                  }}
                  className={secondaryButtonClass}
                >
                  Limpar
                </button>
              </form>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <article className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${palette.textSecondary}`}>Total de setores</p>
                  <p className="mt-1 text-2xl font-bold">{sectors.length}</p>
                </article>
                <article className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${palette.textSecondary}`}>Resultado filtrado</p>
                  <p className="mt-1 text-2xl font-bold">{total}</p>
                </article>
                <article className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${palette.textSecondary}`}>Página atual</p>
                  <p className="mt-1 text-2xl font-bold">{page}/{totalPages}</p>
                </article>
              </div>
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

            <article className={`rounded-2xl border p-4 ${palette.panel}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Setores cadastrados</h2>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  Novo setor
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className={palette.textSecondary}>
                      <th className="px-2.5 py-2 font-semibold">ID</th>
                      <th className="px-2.5 py-2 font-semibold">Nome</th>
                      <th className="px-2.5 py-2 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 8 }, (_, index) => (
                          <tr key={`sectors-skeleton-${index}`} className={`border-t ${tableRowClass}`}>
                            <td className="px-2.5 py-2"><Skeleton isDark={isDark} className="h-4 w-14" /></td>
                            <td className="px-2.5 py-2"><Skeleton isDark={isDark} className="h-4 w-64" /></td>
                            <td className="px-2.5 py-2"><Skeleton isDark={isDark} className="h-4 w-40" /></td>
                          </tr>
                        ))
                      : pageItems.map((sector) => (
                          <tr key={sector.id} className={`border-t transition ${tableRowClass}`}>
                            <td className="px-2.5 py-2">
                              <span className={`inline-flex rounded-md border px-2 py-1 ${isDark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                                #{sector.id}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 font-semibold">{sector.name}</td>
                            <td className="px-2.5 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => openEditModal(sector)} className={secondaryButtonClass}>
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(sector)}
                                  className="h-9 rounded-xl border border-rose-400/40 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                    {!loading && pageItems.length === 0 ? (
                      <tr>
                        <td className={`px-2.5 py-8 text-center ${palette.textSecondary}`} colSpan={3}>
                          Nenhum setor encontrado para o filtro aplicado.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className={`text-xs ${palette.textSecondary}`}>Total: {total} setores</p>
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
                    Página {page} de {totalPages}
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

            <Modal
              isOpen={isCreateModalOpen}
              title="Criar novo setor"
              description="Informe um nome claro para o setor que sera usado na taxonomia documental."
              onClose={() => setIsCreateModalOpen(false)}
              isDark={isDark}
            >
              <form className="space-y-3" onSubmit={handleCreateSubmit}>
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Ex: Qualidade Assistencial"
                  required
                  className={`${inputClass} w-full`}
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 w-full rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creating ? 'Criando...' : 'Criar setor'}
                </button>
              </form>
            </Modal>

            <Modal
              isOpen={isEditModalOpen}
              title="Editar setor"
              description="Atualize o nome do setor mantendo o padrao organizacional da empresa."
              onClose={() => setIsEditModalOpen(false)}
              isDark={isDark}
            >
              <form className="space-y-3" onSubmit={handleEditSubmit}>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Nome do setor"
                  required
                  className={`${inputClass} w-full`}
                />
                <button
                  type="submit"
                  disabled={updating}
                  className="h-10 w-full rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {updating ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </form>
            </Modal>

            <Modal
              isOpen={!!deleteTarget}
              title="Confirmar exclusão"
              description="A exclusão pode ser bloqueada se houver usuários ou documentos vinculados."
              onClose={() => {
                if (!deleting) setDeleteTarget(null)
              }}
              isDark={isDark}
            >
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Deseja excluir o setor <strong>{deleteTarget?.name}</strong>?
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className={secondaryButtonClass} disabled={deleting}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
              </div>
            </Modal>
          </>
        )
      }}
    </AppShell>
  )
}


