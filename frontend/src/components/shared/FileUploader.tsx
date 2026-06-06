import { useRef, useState } from 'react'

interface FileUploaderProps {
  onFileSelected: (file: File | null) => void
  accept?: string
  disabled?: boolean
}

export default function FileUploader({
  onFileSelected,
  accept = 'image/*',
  disabled = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleFile(file: File | null) {
    setFileName(file?.name ?? null)
    setPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    onFileSelected(file)
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/50 px-4 py-8 text-slate-400 transition hover:border-indigo-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {preview ? (
          <img src={preview} alt="preview" className="max-h-40 rounded-md object-contain" />
        ) : (
          <>
            <span className="text-3xl">＋</span>
            <span className="text-sm">Click to choose an image</span>
          </>
        )}
        {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
