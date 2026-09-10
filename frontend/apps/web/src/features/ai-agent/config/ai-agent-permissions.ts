export const aiAgentPermissions = {
  view: "ai.settings.view",
  manage: "ai.settings.manage",
} as const

/** Offered resume delays. null is "never", the safest default. */
export const resumeDelayOptions = [
  { value: "", label: "أبدًا — يبقى متوقفًا حتى يعيده موظف" },
  { value: "30", label: "بعد 30 دقيقة" },
  { value: "60", label: "بعد ساعة" },
  { value: "180", label: "بعد 3 ساعات" },
  { value: "360", label: "بعد 6 ساعات" },
  { value: "720", label: "بعد 12 ساعة" },
  { value: "1440", label: "بعد 24 ساعة" },
] as const
