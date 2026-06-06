import axios from 'axios'

/** Pull a human-readable message out of an Axios/FastAPI error. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
    if (err.response?.status === 503) {
      return 'File storage is not configured on the server yet.'
    }
    return err.message
  }
  return fallback
}
