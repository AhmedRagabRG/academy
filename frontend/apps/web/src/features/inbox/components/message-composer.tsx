"use client"
import { useEffect, useRef, useState } from "react"
import { Paperclip, Smile } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  acceptedAttachmentTypes,
  attachmentLimit,
} from "../config/inbox-config"
import { replySchema } from "../schemas/inbox-schemas"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"
import { useSendReply } from "../hooks/use-inbox-messaging"
import type { ConversationId } from "../types/common"
import {
  ComposerAttachments,
  type ComposerAttachmentItem,
} from "./composer-attachments"
import { inboxService } from "../services/active-inbox-service"

export function MessageComposer({
  conversationId,
  allowed,
}: {
  conversationId: ConversationId
  allowed: boolean
}) {
  const draft = useInboxWorkspaceStore(
    (state) => state.drafts[conversationId] ?? ""
  )
  const setDraft = useInboxWorkspaceStore((state) => state.setDraft)
  const send = useSendReply()
  const [attachments, setAttachments] = useState<ComposerAttachmentItem[]>([])
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const uploads = useRef(new Map<string, AbortController>())
  useEffect(
    () => () => {
      uploads.current.forEach((controller) => controller.abort())
      uploads.current.clear()
    },
    []
  )
  const pendingUploads = attachments.some((item) => item.status === "uploading")
  const readyAttachments = attachments.flatMap((item) =>
    item.status === "ready" && item.attachment ? [item.attachment] : []
  )
  if (!allowed)
    return (
      <p className="border-t p-4 text-center text-sm text-muted-foreground">
        لا تملك صلاحية الرد على هذه المحادثة.
      </p>
    )
  const submit = () => {
    const parsed = replySchema.safeParse({
      body: draft,
      attachmentCount: readyAttachments.length,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "تحقق من الرسالة")
      return
    }
    setError("")
    if (pendingUploads) {
      setError("انتظر حتى يكتمل رفع المرفقات")
      return
    }
    send.mutate(
      {
        conversationId,
        body: draft,
        attachments: readyAttachments,
        retryToken: crypto.randomUUID(),
      },
      {
        onSuccess: () => {
          setDraft(conversationId, "")
          setAttachments([])
        },
      }
    )
  }
  return (
    <div className="border-t bg-card p-3">
      <ComposerAttachments
        items={attachments}
        onRemove={(key) => {
          uploads.current.get(key)?.abort()
          uploads.current.delete(key)
          setAttachments((items) => items.filter((item) => item.key !== key))
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="إضافة رمز تعبيري"
          onClick={() => setDraft(conversationId, `${draft} 😊`)}
        >
          <Smile aria-hidden />
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,.pdf,.doc,.docx"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            if (attachments.length >= 5) {
              setError("يمكن إرفاق خمسة ملفات كحد أقصى")
              return
            }
            if (file.size > attachmentLimit) {
              setError("حجم الملف أكبر من الحد المسموح")
              return
            }
            if (!acceptedAttachmentTypes.has(file.type)) {
              setError("نوع الملف غير مدعوم")
              return
            }
            const key = crypto.randomUUID()
            const controller = new AbortController()
            uploads.current.set(key, controller)
            setError("")
            setAttachments((items) => [
              ...items,
              { key, fileName: file.name, status: "uploading" },
            ])
            try {
              const attachment = await inboxService.stageAttachment(
                file,
                controller.signal
              )
              setAttachments((items) =>
                items.map((item) =>
                  item.key === key
                    ? { ...item, status: "ready", attachment }
                    : item
                )
              )
            } catch (uploadError) {
              if (controller.signal.aborted) return
              setAttachments((items) =>
                items.map((item) =>
                  item.key === key
                    ? {
                        ...item,
                        status: "error",
                        error:
                          uploadError instanceof Error
                            ? uploadError.message
                            : "تعذر رفع الملف",
                      }
                    : item
                )
              )
            } finally {
              uploads.current.delete(key)
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="إرفاق ملف"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip aria-hidden />
        </Button>
        <textarea
          value={draft}
          onChange={(event) => setDraft(conversationId, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder="اكتب رسالة..."
          aria-label="نص الرسالة"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
        <Button
          size="sm"
          aria-label="إرسال الرسالة"
          disabled={send.isPending || pendingUploads}
          onClick={submit}
        >
          إرسال
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Enter للإرسال · Shift + Enter لسطر جديد
      </p>
    </div>
  )
}
