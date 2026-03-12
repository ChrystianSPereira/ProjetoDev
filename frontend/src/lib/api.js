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
    throw new Error(buildMessage(data, 'Falha ao carregar usuarios.'))
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
    throw new Error(buildMessage(data, 'Falha ao criar usuario.'))
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
    throw new Error(buildMessage(data, 'Falha ao atualizar usuario.'))
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
    throw new Error(buildMessage(data, 'Falha ao excluir usuario.'))
  }
}
