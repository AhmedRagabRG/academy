import { httpClient } from "@/shared/api/http-client"
import { useMockServices } from "@/shared/config/service-mode"
import type {
  CreateTeamCommand,
  Team,
  TeamId,
  TeamMemberCommand,
  UpdateTeamCommand,
} from "../types/domain"

export interface TeamsService {
  list(signal?: AbortSignal): Promise<Team[]>
  create(command: CreateTeamCommand): Promise<Team>
  update(command: UpdateTeamCommand): Promise<Team>
  remove(id: TeamId): Promise<void>
  addMember(command: TeamMemberCommand): Promise<Team>
  removeMember(command: TeamMemberCommand): Promise<Team>
}

const httpService: TeamsService = {
  list: (signal) => httpClient.get<Team[]>("/teams", undefined, signal),
  create: (command) => httpClient.post<Team>("/teams", command),
  update: ({ id, ...body }) => httpClient.patch<Team>(`/teams/${id}`, body),
  remove: async (id) => {
    await httpClient.delete<void>(`/teams/${id}`)
  },
  addMember: ({ id, employeeId }) =>
    httpClient.put<Team>(`/teams/${id}/members/${employeeId}`),
  removeMember: ({ id, employeeId }) =>
    httpClient.delete<Team>(`/teams/${id}/members/${employeeId}`),
}

let mockTeams: Team[] = [
  {
    id: "team-support" as TeamId,
    name: "فريق الدعم",
    active: true,
    memberCount: 1,
    members: [{ employeeId: "acc-1", displayName: "أحمد", active: true }],
    createdAt: new Date().toISOString(),
  },
]
const mockService: TeamsService = {
  list: () => Promise.resolve([...mockTeams]),
  create: ({ name }) => {
    const team: Team = {
      id: `team-${mockTeams.length + 1}` as TeamId,
      name,
      active: true,
      memberCount: 0,
      members: [],
      createdAt: new Date().toISOString(),
    }
    mockTeams = [...mockTeams, team]
    return Promise.resolve(team)
  },
  update: ({ id, ...changes }) => {
    mockTeams = mockTeams.map((team) =>
      team.id === id ? { ...team, ...changes } : team,
    )
    return Promise.resolve(mockTeams.find((team) => team.id === id)!)
  },
  remove: (id) => {
    mockTeams = mockTeams.filter((team) => team.id !== id)
    return Promise.resolve()
  },
  addMember: ({ id }) => Promise.resolve(mockTeams.find((t) => t.id === id)!),
  removeMember: ({ id }) => Promise.resolve(mockTeams.find((t) => t.id === id)!),
}

export const teamsService: TeamsService = useMockServices
  ? mockService
  : httpService
