// Sessão da conta de utilizador (clips)
export const userToken = () => localStorage.getItem('userToken') || ''

export const authHeaders = () => {
  const t = userToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export const setUserSession = (token, user) => {
  localStorage.setItem('userToken', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export const clearUserSession = () => {
  localStorage.removeItem('userToken')
  localStorage.removeItem('user')
}

// 123 -> "2:03"
export const mmss = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// "1:23" ou "83" -> segundos (null se inválido)
export const parseTime = (str) => {
  const v = String(str ?? '').trim()
  if (!v) return null
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v)
  const m = v.match(/^(\d{1,3}):([0-5]?\d)$/)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  return null
}
