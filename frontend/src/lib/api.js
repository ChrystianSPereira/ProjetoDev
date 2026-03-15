const API_BASE = '/api'

function formBody(values) {
  return new URLSearchParams(values).toString()
}

function buildMessage(data, fallback) {
  return data?.message || data?.detail || fallback
}

async function parseJson(response) {
  return response.json().catch(() => ({}))
}

export async function loginRequest({ username, password }) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody({ username, password }),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao autenticar.'))
  }

  return data
}

export async function meRequest(token) {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Sessao invalida.'))
  }

  return data
}

export async function listSectorsRequest(token) {
  const response = await fetch(`${API_BASE}/sectors`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar setores.'))
  }

  return data
}


export async function createSectorRequest(token, payload) {
  const response = await fetch(`${API_BASE}/sectors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao criar setor.'))
  }

  return data
}

export async function updateSectorRequest(token, sectorId, payload) {
  const response = await fetch(`${API_BASE}/sectors/${sectorId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao atualizar setor.'))
  }

  return data
}

export async function deleteSectorRequest(token, sectorId) {
  const response = await fetch(`${API_BASE}/sectors/${sectorId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const data = await parseJson(response)
    throw new Error(buildMessage(data, 'Falha ao excluir setor.'))
  }
}

export async function listDocumentTypesRequest(token) {
  const response = await fetch(`${API_BASE}/document-types`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar tipos documentais.'))
  }

  return data
}

export async function listAuditLogsRequest(
  token,
  {
    documentId = '',
    versionId = '',
    actorUserId = '',
    eventType = '',
    startAt = '',
    endAt = '',
    skip = 0,
    limit = 20,
  } = {},
) {
  const params = new URLSearchParams()
  if (documentId) params.set('document_id', String(documentId))
  if (versionId) params.set('version_id', String(versionId))
  if (actorUserId) params.set('actor_user_id', String(actorUserId))
  if (eventType) params.set('event_type', eventType)
  if (startAt) params.set('start_at', startAt)
  if (endAt) params.set('end_at', endAt)
  params.set('skip', String(skip))
  params.set('limit', String(limit))

  const query = params.toString()
  const response = await fetch(`${API_BASE}/audit/logs?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar auditoria.'))
  }

  return data
}

export async function listUsersRequest(token, { q = '', role = '', skip = 0, limit = 10 } = {}) {
  const params = new URLSearchParams()
  if (q.trim()) {
    params.set('q', q.trim())
  }
  if (role.trim()) {
    params.set('role', role.trim())
  }
  params.set('skip', String(skip))
  params.set('limit', String(limit))

  const query = params.toString()
  const response = await fetch(`${API_BASE}/users${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar usuários.'))
  }

  return data
}

export async function createUserRequest(token, payload) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao criar usuário.'))
  }

  return data
}

export async function updateUserRequest(token, userId, payload) {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao atualizar usuário.'))
  }

  return data
}

export async function deleteUserRequest(token, userId) {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const data = await parseJson(response)
    throw new Error(buildMessage(data, 'Falha ao excluir usuário.'))
  }
}

export async function createDraftRequest(token, payload) {
  const response = await fetch(`${API_BASE}/documents/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao criar rascunho.'))
  }

  return data
}

export async function listMyDraftsRequest(token, { skip = 0, limit = 20 } = {}) {
  const params = new URLSearchParams()
  params.set('skip', String(skip))
  params.set('limit', String(limit))

  const response = await fetch(`${API_BASE}/documents/my-drafts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar rascunhos.'))
  }

  return data
}

export async function listReviewQueueRequest(token, { skip = 0, limit = 20 } = {}) {
  const params = new URLSearchParams()
  params.set('skip', String(skip))
  params.set('limit', String(limit))

  const response = await fetch(`${API_BASE}/documents/review-queue?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar fila de aprovação.'))
  }

  return data
}

export async function submitDraftRequest(token, versionId) {
  const response = await fetch(`${API_BASE}/documents/${versionId}/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao submeter rascunho.'))
  }

  return data
}

export async function approveVersionRequest(token, versionId) {
  const response = await fetch(`${API_BASE}/documents/${versionId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao aprovar versão.'))
  }

  return data
}

export async function rejectVersionRequest(token, versionId, reason) {
  const response = await fetch(`${API_BASE}/documents/${versionId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao reprovar versão.'))
  }

  return data
}

export async function searchActiveDocumentsRequest(
  token,
  { q = '', sectorId = '', documentTypeId = '', skip = 0, limit = 20 } = {},
) {
  const params = new URLSearchParams()
  if (q.trim()) {
    params.set('q', q.trim())
  }
  if (sectorId) {
    params.set('sector_id', String(sectorId))
  }
  if (documentTypeId) {
    params.set('document_type_id', String(documentTypeId))
  }
  params.set('skip', String(skip))
  params.set('limit', String(limit))

  const response = await fetch(`${API_BASE}/documents/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao buscar documentos vigentes.'))
  }

  return data
}

export async function listDocumentsRequest(
  token,
  { q = '', sectorId = '', documentTypeId = '', scope = '', status = '', skip = 0, limit = 20 } = {},
) {
  const params = new URLSearchParams()
  if (q.trim()) {
    params.set('q', q.trim())
  }
  if (sectorId) {
    params.set('sector_id', String(sectorId))
  }
  if (documentTypeId) {
    params.set('document_type_id', String(documentTypeId))
  }
  if (scope) {
    params.set('scope', scope)
  }
  if (status) {
    params.set('status', status)
  }
  params.set('skip', String(skip))
  params.set('limit', String(limit))

  const response = await fetch(`${API_BASE}/documents?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar listagem de documentos.'))
  }

  return data
}

export async function getDocumentDetailRequest(token, documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}/detail`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar detalhe do documento.'))
  }

  return data
}
export async function listDocumentVersionsRequest(token, documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao carregar versões do documento.'))
  }

  return data
}


export async function changePasswordRequest(token, payload) {
  const response = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(buildMessage(data, 'Falha ao atualizar senha.'))
  }

  return data
}


