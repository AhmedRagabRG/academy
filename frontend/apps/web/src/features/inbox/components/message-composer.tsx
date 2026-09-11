"use client"
import { Button } from "@workspace/ui/components/button"
import { Smile } from "lucide-react"
import { useState } from "react"
import { replySchema } from "../schemas/inbox-schemas"
import { useInboxWorkspaceStore } from "../stores/inbox-workspace-store"
import { useSendReply } from "../hooks/use-inbox-messaging"
import type { ConversationId } from "../types/common"

/**
 * Text only. Attachments were removed because the backend rejects them outright
 * on every Meta channel (`provider-attachment-not-supported`), which is all the
 * inbox actually delivers on — so the control could only ever produce an error.
 */
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
  const [error, setError] = useState("")
  if (!allowed)
    return (
      <p className="border-t p-4 text-center text-sm text-muted-foreground">
        لا تملك صلاحية الرد على هذه المحادثة.
      </p>
    )
  const submit = () => {
    const parsed = replySchema.safeParse({ body: draft, attachmentCount: 0 })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "تحقق من الرسالة")
      return
    }
    setError("")
    send.mutate(
      {
        conversationId,
        body: draft,
        attachments: [],
        retryToken: crypto.randomUUID(),
      },
      {
        onSuccess: () => setDraft(conversationId, ""),
        // The mutation also toasts, but showing it inline means a failed send
        // cannot be missed — and the draft is deliberately kept.
        onError: (sendError: Error) => setError(sendError.message),
      }
    )
  }
  return (
    <div className="border-t bg-card p-3">
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
          disabled={send.isPending}
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
