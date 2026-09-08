import type { PipelineStageAccent, PipelineStageOutcome } from "../types/domain"

export const accentLabels: Record<PipelineStageAccent, string> = {
  slate: "رمادي",
  blue: "أزرق",
  sky: "سماوي",
  amber: "ذهبي",
  violet: "بنفسجي",
  green: "أخضر",
  red: "أحمر",
}

export const outcomeLabels: Record<PipelineStageOutcome, string> = {
  open: "مفتوحة",
  won: "مكتسبة",
  lost: "غير مكتسبة",
}
