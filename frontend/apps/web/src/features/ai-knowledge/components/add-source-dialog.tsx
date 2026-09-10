"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { FileDropzone } from "@/shared/components/file-upload/file-dropzone"
import {
  acceptedSourceTypes,
  maxSourceBytes,
} from "../config/ai-knowledge-copy"
import { useAddFileSource, useAddTextSource } from "../hooks/use-ai-knowledge"
import type { KnowledgeBaseId, KnowledgeVisibility } from "../types/domain"

export function AddSourceDialog({
  open,
  knowledgeBaseId,
  onClose,
}: {
  open: boolean
  knowledgeBaseId: KnowledgeBaseId
  onClose: () => void
}) {
  const [tab, setTab] = useState<"file" | "text">("file")
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [rawText, setRawText] = useState("")
  const [visibility, setVisibility] =
    useState<KnowledgeVisibility>("customer-facing")
  const addFile = useAddFileSource()
  const addText = useAddTextSource()

  if (!open) return null

  const pending = addFile.isPending || addText.isPending
  const canSubmit =
    tab === "file"
      ? Boolean(file)
      : title.trim().length > 0 && rawText.trim().length > 0

  const reset = () => {
    setFile(null)
    setTitle("")
    setRawText("")
    setVisibility("customer-facing")
    setTab("file")
  }

  const submit = () => {
    const done = () => {
      reset()
      onClose()
    }
    if (tab === "file" && file)
      void addFile
        .mutateAsync({ knowledgeBaseId, file, visibility })
        .then(done)
        .catch(() => undefined)
    if (tab === "text")
      void addText
        .mutateAsync({
          knowledgeBaseId,
          title: title.trim(),
          rawText: rawText.trim(),
          visibility,
        })
        .then(done)
        .catch(() => undefined)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-source-title"
    >
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className="bg-card relative w-full max-w-lg rounded-xl border p-6 shadow-xl">
        <h2 id="add-source-title" className="text-lg font-medium">
          إضافة مصدر معرفة
        </h2>

        <div className="mt-4 flex gap-2" role="tablist">
          <Button
            role="tab"
            aria-selected={tab === "file"}
            variant={tab === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("file")}
          >
            رفع ملف
          </Button>
          <Button
            role="tab"
            aria-selected={tab === "text"}
            variant={tab === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("text")}
          >
            نص مباشر
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {tab === "file" ? (
            <>
              <FileDropzone
                accept={{ ...acceptedSourceTypes }}
                maxSize={maxSourceBytes}
                label="اسحب ملف PDF أو Word أو نص، أو اختر من جهازك"
                onFiles={(files) => setFile(files[0] ?? null)}
              />
              {file && (
                <p className="text-muted-foreground text-sm">
                  المحدد: <bdi>{file.name}</bdi>
                </p>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm">
                <span className="mb-1 block">العنوان</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"
                  maxLength={240}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">النص</span>
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  rows={8}
                  dir="auto"
                />
              </label>
            </>
          )}

          <fieldset className="space-y-1">
            <legend className="text-sm">من يمكنه رؤية هذا المحتوى</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                checked={visibility === "customer-facing"}
                onChange={() => setVisibility("customer-facing")}
              />
              متاح للعملاء — يمكن للمساعد الاقتباس منه في ردوده
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                checked={visibility === "internal"}
                onChange={() => setVisibility("internal")}
              />
              داخلي فقط — لن يظهر للعملاء إطلاقًا
            </label>
          </fieldset>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button disabled={!canSubmit || pending} onClick={submit}>
            {pending ? "جارٍ الرفع..." : "إضافة"}
          </Button>
        </div>
      </div>
    </div>
  )
}
