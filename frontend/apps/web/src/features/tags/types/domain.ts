export type InboxTagId = string & { readonly __brand: "InboxTagId" }

export const tagColors = [
  "blue",
  "amber",
  "red",
  "green",
  "violet",
  "slate",
] as const
export type TagColor = (typeof tagColors)[number]

export interface ManagedTag {
  id: InboxTagId
  label: string
  color: TagColor
  active: boolean
  /** Conversations currently carrying this tag; a tag in use cannot be deleted. */
  usageCount: number
}

export interface CreateTagCommand {
  label: string
  color: TagColor
}
export interface UpdateTagCommand {
  id: InboxTagId
  label?: string
  color?: TagColor
  active?: boolean
}
