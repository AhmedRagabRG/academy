"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { teamsService } from "../services/teams-service"
import type {
  CreateTeamCommand,
  TeamId,
  TeamMemberCommand,
  UpdateTeamCommand,
} from "../types/domain"

export const teamKeys = { all: ["teams"] as const }

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: ({ signal }) => teamsService.list(signal),
  })
}

function useTeamMutation<TVariables>(
  run: (variables: TVariables) => Promise<unknown>,
  success: string,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: teamKeys.all })
      feedback.success(success)
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export const useCreateTeam = () =>
  useTeamMutation((command: CreateTeamCommand) => teamsService.create(command), "تم إنشاء الفريق")
export const useUpdateTeam = () =>
  useTeamMutation((command: UpdateTeamCommand) => teamsService.update(command), "تم حفظ التغييرات")
export const useDeleteTeam = () =>
  useTeamMutation((id: TeamId) => teamsService.remove(id), "تم حذف الفريق")
export const useAddTeamMember = () =>
  useTeamMutation((command: TeamMemberCommand) => teamsService.addMember(command), "تمت إضافة العضو")
export const useRemoveTeamMember = () =>
  useTeamMutation((command: TeamMemberCommand) => teamsService.removeMember(command), "تمت إزالة العضو")
