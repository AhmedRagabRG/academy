import { httpClient } from "@/shared/api/http-client"
import { useMockServices } from "@/shared/config/service-mode"
import type {
  AccountBranchSetting,
  Branch,
  BranchId,
  CreateBranchCommand,
  UpdateBranchCommand,
} from "../types/domain"

export interface BranchesService {
  list(signal?: AbortSignal): Promise<Branch[]>
  create(command: CreateBranchCommand): Promise<Branch>
  update(command: UpdateBranchCommand): Promise<Branch>
  remove(id: BranchId, version: number): Promise<void>
  accounts(signal?: AbortSignal): Promise<AccountBranchSetting[]>
  setAccountBranches(
    accountId: string,
    branchIds: string[]
  ): Promise<{ accountId: string; branchIds: string[] }>
}

const httpService: BranchesService = {
  list: (signal) => httpClient.get<Branch[]>("/branches", undefined, signal),
  create: (command) => httpClient.post<Branch>("/branches", command),
  update: ({ id, expectedVersion, ...body }) =>
    httpClient.patch<Branch>(
      `/branches/${id}?expectedVersion=${expectedVersion}`,
      body
    ),
  remove: async (id) => {
    await httpClient.delete<void>(`/branches/${id}`)
  },
  accounts: (signal) =>
    httpClient.get<AccountBranchSetting[]>(
      "/branches/accounts",
      undefined,
      signal
    ),
  setAccountBranches: (accountId, branchIds) =>
    httpClient.put<{ accountId: string; branchIds: string[] }>(
      `/branches/accounts/${accountId}`,
      { branchIds }
    ),
}

let mockBranches: Branch[] = [
  {
    id: "branch-cairo" as BranchId,
    code: "cairo",
    name: "القاهرة",
    address: "شارع التحرير، الإسكندرية",
    phone: "+2021234567890",
    email: "cairo@example.com",
    active: true,
    contactCount: 124,
    ticketCount: 38,
    memberCount: 3,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "branch-giza" as BranchId,
    code: "giza",
    name: "الجيزة",
    address: null,
    phone: null,
    email: null,
    active: true,
    contactCount: 56,
    ticketCount: 12,
    memberCount: 2,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const mockAccounts: AccountBranchSetting[] = [
  {
    accountId: "acc-1",
    displayName: "أحمد محمد",
    branchIds: ["branch-cairo" as BranchId],
    organizationWide: false,
  },
  {
    accountId: "acc-2",
    displayName: "سارة علي",
    branchIds: ["branch-giza" as BranchId],
    organizationWide: false,
  },
  {
    accountId: "acc-3",
    displayName: "عمر حسن",
    branchIds: [],
    organizationWide: true,
  },
]

const mockService: BranchesService = {
  list: () => Promise.resolve([...mockBranches]),
  create: ({ name, code, ...rest }) => {
    const branch: Branch = {
      id: `branch-${mockBranches.length + 1}` as BranchId,
      code,
      name,
      address: rest.address ?? null,
      phone: rest.phone ?? null,
      email: rest.email ?? null,
      active: true,
      contactCount: 0,
      ticketCount: 0,
      memberCount: 0,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockBranches.push(branch)
    return Promise.resolve(branch)
  },
  update: ({ id, expectedVersion, ...changes }) => {
    const branch = mockBranches.find((b) => b.id === id)
    if (!branch) throw new Error("Branch not found")
    if (branch.version !== expectedVersion) throw new Error("Version conflict")
    const updated = {
      ...branch,
      ...changes,
      version: branch.version + 1,
      updatedAt: new Date().toISOString(),
    }
    Object.assign(branch, updated)
    return Promise.resolve(updated)
  },
  remove: (id) => {
    mockBranches = mockBranches.filter((b) => b.id !== id)
    return Promise.resolve()
  },
  accounts: () => Promise.resolve([...mockAccounts]),
  setAccountBranches: (accountId, branchIds) => {
    const account = mockAccounts.find((a) => a.accountId === accountId)
    if (!account) throw new Error("Account not found")
    account.branchIds = branchIds
    return Promise.resolve({ accountId, branchIds })
  },
}

export const branchesService: BranchesService = useMockServices
  ? mockService
  : httpService
