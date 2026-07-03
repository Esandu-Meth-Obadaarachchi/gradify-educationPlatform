import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import type {
  Difficulty,
  Paper,
  PaperCreatePayload,
  PaperDetail,
  PaperStatus,
  PaperSummary,
  PaperUpdatePayload,
  Question,
  QuestionPart,
  Subject,
  Topic,
} from '../types'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({ baseURL })

// Attach the JWT from the Zustand store to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, drop the (now-invalid) token so the app bounces back to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

interface TokenResponse {
  access_token: string
  token_type: string
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get<{ username: string }>('/auth/me').then((r) => r.data),
}

export const subjectsApi = {
  list: () => api.get<Subject[]>('/subjects').then((r) => r.data),
  create: (name: string) => api.post<Subject>('/subjects', { name }).then((r) => r.data),
  update: (id: number, name: string) =>
    api.put<Subject>(`/subjects/${id}`, { name }).then((r) => r.data),
  remove: (id: number) => api.delete(`/subjects/${id}`).then((r) => r.data),
}

export const topicsApi = {
  list: (subjectId?: number) =>
    api
      .get<Topic[]>('/topics', { params: subjectId ? { subject_id: subjectId } : {} })
      .then((r) => r.data),
  create: (name: string, subject_id: number) =>
    api.post<Topic>('/topics', { name, subject_id }).then((r) => r.data),
  update: (id: number, data: Partial<{ name: string; subject_id: number }>) =>
    api.put<Topic>(`/topics/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/topics/${id}`).then((r) => r.data),
}

export interface QuestionFilters {
  subject_id?: number
  topic_id?: number
  difficulty?: Difficulty
}

export const questionsApi = {
  list: (filters: QuestionFilters = {}) =>
    api.get<Question[]>('/questions', { params: filters }).then((r) => r.data),
  create: (file: File, topic_id: number, difficulty: Difficulty, marks?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('topic_id', String(topic_id))
    form.append('difficulty', difficulty)
    if (marks && marks.trim()) form.append('marks', marks.trim())
    return api.post<Question>('/questions', form).then((r) => r.data)
  },
  update: (
    id: number,
    data: Partial<{
      topic_id: number
      difficulty: Difficulty
      original_marks: number | null
      parts: QuestionPart[] | null
    }>,
  ) => api.put<Question>(`/questions/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/questions/${id}`).then((r) => r.data),
}

export const papersApi = {
  list: () => api.get<PaperSummary[]>('/papers').then((r) => r.data),
  get: (id: number) => api.get<PaperDetail>(`/papers/${id}`).then((r) => r.data),
  create: (data: PaperCreatePayload) =>
    api.post<Paper>('/papers', data).then((r) => r.data),
  update: (id: number, data: PaperUpdatePayload) =>
    api.put<PaperDetail>(`/papers/${id}`, data).then((r) => r.data),
  updateStatus: (id: number, status: PaperStatus) =>
    api.patch<Paper>(`/papers/${id}/status`, { status }).then((r) => r.data),
  remove: (id: number) => api.delete(`/papers/${id}`).then((r) => r.data),
  addQuestion: (
    id: number,
    body: {
      question_id: number
      marks?: number
      part_marks?: QuestionPart[] | null
      question_number?: number
    },
  ) => api.post<PaperDetail>(`/papers/${id}/questions`, body).then((r) => r.data),
  updateQuestion: (
    id: number,
    pqId: number,
    body: { question_number?: number; marks?: number; part_marks?: QuestionPart[] | null },
  ) => api.put<PaperDetail>(`/papers/${id}/questions/${pqId}`, body).then((r) => r.data),
  reorder: (id: number, orderedIds: number[]) =>
    api
      .put<PaperDetail>(`/papers/${id}/questions/reorder`, { ordered_ids: orderedIds })
      .then((r) => r.data),
  removeQuestion: (id: number, pqId: number) =>
    api.delete<PaperDetail>(`/papers/${id}/questions/${pqId}`).then((r) => r.data),
  exportPdf: (id: number) =>
    api.get(`/papers/${id}/export`, { responseType: 'blob' }).then((r) => r.data as Blob),
}
