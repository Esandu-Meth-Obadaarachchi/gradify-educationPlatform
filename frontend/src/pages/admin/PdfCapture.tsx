import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { questionsApi, subjectsApi, topicsApi } from '../../services/api'
import { DIFFICULTIES, type Difficulty } from '../../types'
import { getErrorMessage } from '../../lib/errors'
import LoadingSpinner from '../../components/shared/LoadingSpinner'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// Render at 2x so a cropped region stays crisp when re-displayed / printed.
const RENDER_SCALE = 2

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-indigo-500'
const labelClass = 'mb-1 block text-sm text-slate-400'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Captured {
  id: number
  topicName: string
  marks: string
  thumb: string
}

export default function PdfCapture() {
  const qc = useQueryClient()
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectsApi.list })
  const { data: allTopics } = useQuery({ queryKey: ['topics', 'all'], queryFn: () => topicsApi.list() })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTask = useRef<ReturnType<pdfjsLib.PDFPageProxy['render']> | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [rendering, setRendering] = useState(false)
  const [fileName, setFileName] = useState('')

  // Capture-panel state (sticky across captures so you set topic once).
  const [topicId, setTopicId] = useState<number | ''>('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [marks, setMarks] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Selection rectangle in canvas pixel coords + a live crop preview.
  const [rect, setRect] = useState<Rect | null>(null)
  const [cropUrl, setCropUrl] = useState<string | null>(null)
  const cropBlob = useRef<Blob | null>(null)
  const drag = useRef<{ startX: number; startY: number } | null>(null)

  const [captured, setCaptured] = useState<Captured[]>([])

  const topicName = useMemo(
    () => allTopics?.find((t) => t.id === topicId)?.name ?? '',
    [allTopics, topicId],
  )

  // --- Load a PDF file ---
  async function onFile(file: File) {
    setError(null)
    setCaptured([])
    clearSelection()
    const buf = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise
    pdfRef.current = pdf
    setFileName(file.name)
    setNumPages(pdf.numPages)
    setPageNum(1)
  }

  // --- Render the current page to the canvas ---
  useEffect(() => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return
    let cancelled = false
    setRendering(true)
    clearSelection()
    ;(async () => {
      const page = await pdf.getPage(pageNum)
      if (cancelled) return
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      renderTask.current?.cancel()
      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTask.current = task
      try {
        await task.promise
      } catch {
        /* cancelled render — ignore */
      }
      if (!cancelled) setRendering(false)
    })()
    return () => {
      cancelled = true
    }
  }, [pageNum, numPages])

  // --- Selection handlers (coords relative to the canvas bitmap) ---
  function toCanvasCoords(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const box = canvas.getBoundingClientRect()
    const scaleX = canvas.width / box.width
    const scaleY = canvas.height / box.height
    return {
      x: (e.clientX - box.left) * scaleX,
      y: (e.clientY - box.top) * scaleY,
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (rendering) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const p = toCanvasCoords(e)
    drag.current = { startX: p.x, startY: p.y }
    setRect({ x: p.x, y: p.y, w: 0, h: 0 })
    setCropUrl(null)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const p = toCanvasCoords(e)
    const { startX, startY } = drag.current
    setRect({
      x: Math.min(startX, p.x),
      y: Math.min(startY, p.y),
      w: Math.abs(p.x - startX),
      h: Math.abs(p.y - startY),
    })
  }

  function onPointerUp() {
    drag.current = null
    if (rect && rect.w > 8 && rect.h > 8) makeCrop(rect)
  }

  function makeCrop(r: Rect) {
    const canvas = canvasRef.current!
    const out = document.createElement('canvas')
    out.width = Math.round(r.w)
    out.height = Math.round(r.h)
    const ctx = out.getContext('2d')!
    ctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height)
    out.toBlob((blob) => {
      if (!blob) return
      cropBlob.current = blob
      if (cropUrl) URL.revokeObjectURL(cropUrl)
      setCropUrl(URL.createObjectURL(blob))
    }, 'image/png')
  }

  function clearSelection() {
    setRect(null)
    cropBlob.current = null
    setCropUrl((u) => {
      if (u) URL.revokeObjectURL(u)
      return null
    })
  }

  // --- Save the crop as a question ---
  const saveMut = useMutation({
    mutationFn: () => {
      const file = new File([cropBlob.current!], 'question.png', { type: 'image/png' })
      return questionsApi.create(file, Number(topicId), difficulty, marks)
    },
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      setCaptured((prev) => [
        { id: q.id, topicName, marks: marks.trim(), thumb: cropUrl ?? q.image_url },
        ...prev,
      ])
      setMarks('')
      setRect(null)
      cropBlob.current = null
      setCropUrl(null) // keep the object URL alive for the thumbnail list
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const canSave = !!cropBlob.current && !!topicId && !saveMut.isPending
  const noTopics = !allTopics?.length

  const rectStyle = rect
    ? (() => {
        const canvas = canvasRef.current
        if (!canvas) return {}
        const box = canvas.getBoundingClientRect()
        const sx = box.width / canvas.width
        const sy = box.height / canvas.height
        return {
          left: rect.x * sx,
          top: rect.y * sy,
          width: rect.w * sx,
          height: rect.h * sy,
        }
      })()
    : {}

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/questions" className="text-sm text-slate-400 transition hover:text-slate-200">
            ← Question Bank
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Capture from PDF</h1>
        </div>
        <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500">
          {fileName ? 'Change PDF' : 'Upload PDF'}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {noTopics && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Create a subject and topic first, then capture questions.
        </p>
      )}

      {!pdfRef.current ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center text-slate-400">
          Upload a past-paper PDF. Then drag a box around each question and enter its marks on the right.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* PDF page + selection overlay */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
              <span className="truncate">{fileName}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNum((n) => Math.max(1, n - 1))}
                  disabled={pageNum <= 1}
                  className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40"
                >
                  ←
                </button>
                <span>
                  Page {pageNum} / {numPages}
                </span>
                <button
                  onClick={() => setPageNum((n) => Math.min(numPages, n + 1))}
                  disabled={pageNum >= numPages}
                  className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
            <div className="relative max-h-[75vh] overflow-auto rounded bg-slate-950 p-2">
              <div className="relative inline-block">
                <canvas
                  ref={canvasRef}
                  className="block w-full max-w-full cursor-crosshair touch-none select-none rounded bg-white"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                />
                {rect && (
                  <div
                    className="pointer-events-none absolute border-2 border-indigo-400 bg-indigo-400/15"
                    style={rectStyle}
                  />
                )}
                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Drag across the question to grab it. Re-drag to redo the selection.
            </p>
          </div>

          {/* Capture panel */}
          <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 font-semibold text-white">Selected question</h2>
              {cropUrl ? (
                <img
                  src={cropUrl}
                  alt="selection"
                  className="mb-3 max-h-52 w-full rounded border border-slate-700 bg-white object-contain"
                />
              ) : (
                <div className="mb-3 flex h-28 items-center justify-center rounded border border-dashed border-slate-700 text-sm text-slate-500">
                  No selection yet
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Topic</label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : '')}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a topic
                    </option>
                    {allTopics?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {subjects?.find((s) => s.id === t.subject_id)?.name} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className={inputClass}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d} className="capitalize">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Marks</label>
                  <input
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="e.g. 3,1,2 or 5"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Commas make sub-parts (3,1,2 → a·b·c). Blank if unknown.
                  </p>
                </div>
                {error && (
                  <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
                )}
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={!canSave}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saveMut.isPending ? 'Saving…' : 'Save question'}
                </button>
              </div>
            </div>

            {captured.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-3 font-semibold text-white">
                  Captured{' '}
                  <span className="text-sm font-normal text-slate-500">({captured.length})</span>
                </h2>
                <div className="space-y-2">
                  {captured.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 p-2"
                    >
                      <img
                        src={c.thumb}
                        alt=""
                        className="h-10 w-16 rounded border border-slate-700 bg-white object-contain"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="truncate text-slate-300">{c.topicName}</div>
                        <div className="text-slate-500">{c.marks || 'no marks'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
