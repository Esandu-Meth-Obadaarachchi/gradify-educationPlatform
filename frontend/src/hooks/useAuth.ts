import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const username = useAuthStore((s) => s.username)
  const logout = useAuthStore((s) => s.logout)
  return { token, username, isAuthenticated: Boolean(token), logout }
}
