import { useCallback, useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/layout/AppShell'
import { FeedbackBanner } from '../components/ui/FeedbackBanner'
import { Skeleton } from '../components/ui/Skeleton'
import { getAccessToken } from '../features/auth/authStorage'
import {
  createUserRequest,
  deleteUserRequest,
  listSectorsRequest,
  listUsersRequest,
  updateUserRequest,
} from '../lib/api'

const BASE_ROLES = ['AUTOR', 'COORDENADOR', 'LEITOR']
const PAGE_SIZE = 10

function Modal({ isOpen, title, onClose, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-slate-950/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'AUTOR',
  sectorId: '',
}

function roleBadgeClass(role, isDark) {
  if (role === 'ADMINISTRADOR') {
    return isDark
      ? 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300'
      : 'border-fuchsia-400/50 bg-fuchsia-100 text-fuchsia-700'
  }

  if (role === 'COORDENADOR') {
    return isDark
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : 'border-emerald-400/50 bg-emerald-100 text-emerald-700'
  }

  if (role === 'AUTOR') {
    return isDark
      ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
      : 'border-blue-400/50 bg-blue-100 text-blue-700'
  }

  return isDark
    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
    : 'border-amber-400/50 bg-amber-100 text-amber-700'
}

export function UsersPage() {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [appliedRoleFilter, setAppliedRoleFilter] = useState('')

  const [users, setUsers] = useState([])
  const [sectorsById, setSectorsById] = useState({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [createForm, setCreateForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editUserId, setEditUserId] = useState(null)

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const FILTER_DEBOUNCE_MS = 500

  const loadUsers = useCallback(async (targetPage, targetQuery, targetRole) => {
    const token = getAccessToken()
    if (!token) return

    try {
      setLoading(true)
      setError('')
      const data = await listUsersRequest(token, {
        q: targetQuery,
        role: targetRole,
        skip: (targetPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      setUsers(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSectors = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    try {
      const sectors = await listSectorsRequest(token)
      const map = sectors.reduce((acc, sector) => {
        acc[sector.id] = sector.name
        return acc
      }, {})
      setSectorsById(map)
    } catch {
      setSectorsById({})
    }
  }, [])

  useEffect(() => {
    loadSectors()
  }, [loadSectors])

  useEffect(() => {
    loadUsers(page, appliedQuery, appliedRoleFilter)
  }, [page, appliedQuery, appliedRoleFilter, loadUsers])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedQuery(query)
      setAppliedRoleFilter(roleFilter)
      setPage(1)
    }, FILTER_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query, roleFilter, FILTER_DEBOUNCE_MS])

  function resetCreateForm() {
    setCreateForm(EMPTY_FORM)
  }

  function openCreateModal() {
    setError('')
    setFeedback('')
    resetCreateForm()
    setIsCreateModalOpen(true)
  }

  function openEditModal(user) {
    setError('')
    setFeedback('')
    setEditUserId(user.id)
    setEditForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      sectorId: String(user.sector_id || ''),
    })
    setIsEditModalOpen(true)
  }

  async function handleSearch(event) {
    event.preventDefault()
    setFeedback('')
    setAppliedQuery(query)
    setAppliedRoleFilter(roleFilter)
    setPage(1)
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    const token = getAccessToken()
    if (!token) return

    try {
      setCreating(true)
      setFeedback('')
      setError('')

      await createUserRequest(token, {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        sector_id: Number(createForm.sectorId),
      })

      setFeedback('Usuário criado com sucesso.')
      setIsCreateModalOpen(false)
      resetCreateForm()
      setPage(1)
      await loadUsers(1, appliedQuery, appliedRoleFilter)
      await loadSectors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar usuário.')
    } finally {
      setCreating(false)
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    const token = getAccessToken()
    if (!token || !editUserId) return

    try {
      setUpdating(true)
      setFeedback('')
      setError('')

      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        sector_id: Number(editForm.sectorId),
      }

      if (editForm.password.trim()) {
        payload.password = editForm.password
      }

      await updateUserRequest(token, editUserId, payload)

      setFeedback('Usuário atualizado com sucesso.')
      setIsEditModalOpen(false)
      await loadUsers(page, appliedQuery, appliedRoleFilter)
      await loadSectors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar usuário.')
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

      await deleteUserRequest(token, deleteTarget.id)

      setFeedback('Usuário excluido com sucesso.')
      setDeleteTarget(null)
      await loadUsers(page, appliedQuery, appliedRoleFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir usuário.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell title="Gestão de Usuários" subtitle="Administração de acessos e perfis da plataforma.">
      {({ palette, canManageUsers, isDark, currentUser }) => {
        const inputClass = isDark
          ? 'h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none'
          : 'h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none'

        const selectClass = `${inputClass} appearance-none pr-9`

        const secondaryButtonClass = isDark
          ? 'h-9 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800'
          : 'h-9 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100'
        const fieldLabelClass = isDark
          ? 'mb-1 block text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase'
          : 'mb-1 block text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase'
        const availableRoles =
          currentUser?.role === 'ADMINISTRADOR'
            ? [...BASE_ROLES, 'ADMINISTRADOR']
            : BASE_ROLES
        const sectorsList = Object.entries(sectorsById)
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

        return (
          <>
            {!canManageUsers ? (
              <article className={`rounded-2xl border p-4 ${palette.panel}`}>
                <p className="text-sm text-rose-500">Acesso restrito ao perfil Administrador.</p>
              </article>
            ) : (
              <>
                <article className={`rounded-2xl border p-4 ${palette.panel}`}>
                  <form className="grid gap-2 md:grid-cols-[1fr_220px_auto]" onSubmit={handleSearch}>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por nome ou email"
                      className={inputClass}
                    />

                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value)}
                      className={selectClass}
                      style={{ colorScheme: isDark ? 'dark' : 'light' }}
                    >
                      <option value="">Todos os perfis</option>
                      {availableRoles.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Filtrar
                    </button>

                  </form>
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
                    <h2 className="text-base font-semibold">Usuários cadastrados</h2>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Novo usuário
                    </button>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className={palette.textSecondary}>
                          <th className="px-2.5 py-2 font-semibold">ID</th>
                          <th className="px-2.5 py-2 font-semibold">Nome</th>
                          <th className="px-2.5 py-2 font-semibold">Email</th>
                          <th className="px-2.5 py-2 font-semibold">Perfil</th>
                          <th className="px-2.5 py-2 font-semibold">Setor</th>
                          <th className="px-2.5 py-2 text-right font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading
                          ? Array.from({ length: 8 }, (_, index) => (
                              <tr key={`users-skeleton-${index}`} className="border-t border-slate-700/40">
                                {Array.from({ length: 6 }, (_, colIndex) => (
                                  <td key={`users-skeleton-${index}-${colIndex}`} className="px-2.5 py-2">
                                    <Skeleton isDark={isDark} className="h-4 w-full max-w-[140px]" />
                                  </td>
                                ))}
                              </tr>
                            ))
                          : users.map((user) => (
                              <tr key={user.id} className="border-t border-slate-700/40">
                                <td className="px-2.5 py-2">
                                  <span className={`inline-flex rounded-md border px-2 py-1 ${isDark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                                    #{user.id}
                                  </span>
                                </td>
                                <td className="px-2.5 py-2">{user.name}</td>
                                <td className="px-2.5 py-2">{user.email}</td>
                                <td className="px-2.5 py-2">
                                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${roleBadgeClass(user.role, isDark)}`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-2.5 py-2">{sectorsById[user.sector_id] || `Setor ${user.sector_id}`}</td>
                                <td className="px-2.5 py-2">
                                  <div className="flex items-center justify-end gap-2">
                                    <button type="button" onClick={() => openEditModal(user)} className={secondaryButtonClass}>
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget(user)}
                                      className="h-9 rounded-xl border border-rose-400/40 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        {!loading && users.length === 0 ? (
                          <tr>
                            <td className={`px-2.5 py-5 text-center ${palette.textSecondary}`} colSpan={6}>
                              Nenhum usuário encontrado.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className={`text-xs ${palette.textSecondary}`}>Total: {total} usuários</p>
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
              </>
            )}

            <Modal
              isOpen={isCreateModalOpen}
              title="Criar novo usuário"
              onClose={() => setIsCreateModalOpen(false)}
            >
              <p className={`mb-4 text-xs ${palette.textSecondary}`}>
                Cadastre um usuário definindo perfil de acesso e setor responsavel.
              </p>

              <form className="space-y-4" onSubmit={handleCreateSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className={fieldLabelClass}>Nome completo</span>
                    <input
                      value={createForm.name}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Ex: Maria da Silva"
                      required
                      className={`${inputClass} w-full`}
                    />
                  </label>

                  <label className="block">
                    <span className={fieldLabelClass}>Email corporativo</span>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="maria.silva@empresa.com"
                      required
                      className={`${inputClass} w-full`}
                    />
                  </label>

                  <label className="block">
                    <span className={fieldLabelClass}>Senha inicial</span>
                    <input
                      value={createForm.password}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                      type="password"
                      placeholder="Minimo 6 caracteres"
                      required
                      minLength={6}
                      className={`${inputClass} w-full`}
                    />
                  </label>

                  <label className="block">
                    <span className={fieldLabelClass}>Perfil</span>
                    <select
                      value={createForm.role}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
                      className={`${selectClass} w-full`}
                      style={{ colorScheme: isDark ? 'dark' : 'light' }}
                    >
                      {availableRoles.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className={fieldLabelClass}>Setor</span>
                    <select
                      value={createForm.sectorId}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, sectorId: event.target.value }))}
                      className={`${selectClass} w-full`}
                      style={{ colorScheme: isDark ? 'dark' : 'light' }}
                      required
                    >
                      <option value="">Selecione o setor</option>
                      {sectorsList.map((sector) => (
                        <option key={sector.id} value={sector.id}>
                          {sector.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={`rounded-xl border p-3 text-[11px] ${isDark ? 'border-slate-700 bg-slate-950/70 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  O usuário criado recebera as permissões conforme o perfil selecionado e podera atuar no setor definido.
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className={secondaryButtonClass}
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {creating ? 'Criando...' : 'Criar usuário'}
                  </button>
                </div>
              </form>
            </Modal>

            <Modal isOpen={isEditModalOpen} title="Editar usuário" onClose={() => setIsEditModalOpen(false)}>
              <form className="grid gap-2 md:grid-cols-2" onSubmit={handleEditSubmit}>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nome completo"
                  required
                  className={inputClass}
                />
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email corporativo"
                  required
                  className={inputClass}
                />
                <input
                  value={editForm.password}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                  type="password"
                  placeholder="Nova senha (opcional)"
                  minLength={6}
                  className={inputClass}
                />
                <select
                  value={editForm.role}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
                  className={selectClass}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                >
                  {availableRoles.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={editForm.sectorId}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, sectorId: event.target.value }))}
                  className={selectClass}
                  style={{ colorScheme: isDark ? 'dark' : 'light' }}
                  required
                >
                  <option value="">Selecione o setor</option>
                  {sectorsList.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={updating}
                  className="md:col-span-2 h-10 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {updating ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </form>
            </Modal>

            <Modal
              isOpen={!!deleteTarget}
              title="Confirmar exclusão"
              onClose={() => {
                if (!deleting) setDeleteTarget(null)
              }}
            >
              <p className="text-sm text-slate-300">
                Deseja excluir o usuário <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
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






