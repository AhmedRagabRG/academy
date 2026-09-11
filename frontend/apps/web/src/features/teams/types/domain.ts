export type TeamId = string & { readonly __brand: "TeamId" }

export interface TeamMember {
  employeeId: string
  displayName: string
  active: boolean
}

export interface Team {
  id: TeamId
  name: string
  active: boolean
  memberCount: number
  members: TeamMember[]
  createdAt: string
}

export interface CreateTeamCommand {
  name: string
}
export interface UpdateTeamCommand {
  id: TeamId
  name?: string
  active?: boolean
}
export interface TeamMemberCommand {
  id: TeamId
  employeeId: string
}
