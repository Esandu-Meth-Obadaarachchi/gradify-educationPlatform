export interface Subject {
  id: number
  name: string
  created_at: string
}

export interface Topic {
  id: number
  name: string
  subject_id: number
  created_at: string
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export interface QuestionPart {
  label: string
  marks: number
}

export interface Question {
  id: number
  topic_id: number
  image_url: string
  difficulty: Difficulty
  original_marks: number | null
  parts: QuestionPart[] | null
  created_at: string
}

export type PaperStatus = 'draft' | 'published'

export interface CoverPageData {
  institution?: string
  exam_date?: string
  instructions?: string
}

export interface Paper {
  id: number
  title: string
  subject_id: number
  total_marks: number
  duration_minutes: number
  status: PaperStatus
  cover_page_data: CoverPageData | null
  created_at: string
}

export interface PaperSummary extends Paper {
  subject_name: string | null
  question_count: number
}

export interface PaperQuestion {
  id: number
  paper_id: number
  question_id: number
  question_number: number
  marks: number
  part_marks: QuestionPart[] | null
  order_index: number
  image_url: string | null
  topic_id: number | null
  original_marks: number | null
  original_parts: QuestionPart[] | null
}

export interface PaperDetail extends Paper {
  subject_name: string | null
  questions: PaperQuestion[]
}

export interface PaperCreatePayload {
  title: string
  subject_id: number
  total_marks?: number
  duration_minutes?: number
  cover_page_data?: CoverPageData | null
}

export interface PaperUpdatePayload {
  title?: string
  subject_id?: number
  total_marks?: number
  duration_minutes?: number
  cover_page_data?: CoverPageData | null
}
