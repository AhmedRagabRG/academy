"use client"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
export function RichTextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": label } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  })
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <EditorContent
        editor={editor}
        className="min-h-28 rounded-lg border border-input p-3"
      />
    </div>
  )
}
