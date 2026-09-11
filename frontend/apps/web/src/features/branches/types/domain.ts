export type BranchId = string & { readonly __brand: "BranchId" }

export interface Branch {
  id: BranchId
  code: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  active: boolean
  contactCount: number
  ticketCount: number
  memberCount: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateBranchCommand {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
}

export interface UpdateBranchCommand {
  id: BranchId
  expectedVersion: number
  name?: string
  code?: string
  address?: string | null
  phone?: string | null
  email?: string | null
  active?: boolean
}

export interface AccountBranchSetting {
  accountId: string
  displayName: string
  branchIds: string[]
  organizationWide: boolean
}
