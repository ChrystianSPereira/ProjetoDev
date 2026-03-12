const API_BASE = '/api'

function formBody(values) {
  return new URLSearchParams(values).toString()
}

export async function loginRequest({ username, password }) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody({ username, password }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.message || data?.detail || 'Falha ao autenticar.'
    throw new Error(message)
  }

  return data
}

export async function meRequest(token) {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.message || data?.detail || 'Sessao invalida.'
    throw new Error(message)
  }

  return data
}
