const ACCESS_TOKEN_KEY = 'projetodev:access-token'

export function saveAccessToken(token, remember) {
  const target = remember ? window.localStorage : window.sessionStorage
  const other = remember ? window.sessionStorage : window.localStorage

  other.removeItem(ACCESS_TOKEN_KEY)
  target.setItem(ACCESS_TOKEN_KEY, token)
}

export function getAccessToken() {
  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ||
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
  )
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
