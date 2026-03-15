const ACCESS_TOKEN_KEY = 'projetodev:access-token'
const USER_PROFILE_KEY = 'projetodev:user-profile'

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

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

export function saveUserProfile(profile, remember = true) {
  const serialized = JSON.stringify(profile)
  const target = remember ? window.localStorage : window.sessionStorage
  const other = remember ? window.sessionStorage : window.localStorage

  other.removeItem(USER_PROFILE_KEY)
  target.setItem(USER_PROFILE_KEY, serialized)
}

export function getUserProfile() {
  const fromLocal = window.localStorage.getItem(USER_PROFILE_KEY)
  if (fromLocal) {
    return safeParse(fromLocal)
  }

  const fromSession = window.sessionStorage.getItem(USER_PROFILE_KEY)
  if (fromSession) {
    return safeParse(fromSession)
  }

  return null
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(USER_PROFILE_KEY)
  window.sessionStorage.removeItem(USER_PROFILE_KEY)
}

