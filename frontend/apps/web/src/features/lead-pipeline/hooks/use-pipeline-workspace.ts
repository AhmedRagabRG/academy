"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { pipelineService } from "../services/active-pipeline-service"
import { pipelineKeys } from "../services/pipeline-query-keys"
import type { PipelineListQuery } from "../services/pipeline-service"
import type {
  Lead,
  LeadDraft,
  LeadStageId,
  PipelineFilters,
} from "../types/domain"

const initialFilters: PipelineFilters = {
  query: "",
  agentId: "",
  source: "",
  priority: "",
  outcome: "",
}

const emptyDefinition = { id: "", name: "", stages: [] }

export function usePipelineWorkspace(initialSelectedId?: string) {
  const client = useQueryClient()
  const [filters, setFilters] = useState<PipelineFilters>(initialFilters)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null
  )

  const listQuery: PipelineListQuery = {
    search: filters.query,
    agentId: filters.agentId,
    source: filters.source,
    priority: filters.priority,
    outcome: filters.outcome,
  }

  const definition = useQuery({
    queryKey: pipelineKeys.definition,
    queryFn: ({ signal }) => pipelineService.definition(signal),
    staleTime: Infinity,
  })
  const agents = useQuery({
    queryKey: pipelineKeys.agents,
    queryFn: ({ signal }) => pipelineService.agents(signal),
    staleTime: Infinity,
  })
  const contacts = useQuery({
    queryKey: pipelineKeys.contacts,
    queryFn: ({ signal }) => pipelineService.contacts(signal),
  })
  const leads = useQuery({
    queryKey: pipelineKeys.leads(listQuery),
    queryFn: ({ signal }) => pipelineService.leads(listQuery, signal),
  })

  const rows = leads.data ?? []
  const selectedLead = rows.find((lead) => lead.id === selectedId) ?? null

  const refreshLeads = () =>
    client.invalidateQueries({ queryKey: pipelineKeys.leadLists() })

  /**
   * A stage move is applied to the cache first: the board is a drag surface,
   * and a card that springs back to its old column while the request is in
   * flight reads as a failed drop.
   */
  const move = useMutation({
    mutationFn: ({
      leadId,
      stageId,
    }: {
      leadId: string
      stageId: LeadStageId
    }) => pipelineService.moveLead(leadId, stageId),
    onMutate: async ({ leadId, stageId }) => {
      await client.cancelQueries({ queryKey: pipelineKeys.leadLists() })
      const key = pipelineKeys.leads(listQuery)
      const previous = client.getQueryData<Lead[]>(key)
      client.setQueryData<Lead[]>(key, (current) =>
        (current ?? []).map((lead) =>
          lead.id === leadId ? { ...lead, stageId } : lead
        )
      )
      return { key, previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous)
    },
    onSettled: refreshLeads,
  })

  const create = useMutation({
    mutationFn: (draft: LeadDraft) => pipelineService.createLead(draft),
    onSuccess: async (lead) => {
      setSelectedId(lead.id)
      await refreshLeads()
    },
  })

  const update = useMutation({
    mutationFn: ({ leadId, draft }: { leadId: string; draft: LeadDraft }) =>
      pipelineService.updateLead(leadId, draft),
    onSuccess: refreshLeads,
  })

  const note = useMutation({
    mutationFn: ({ leadId, content }: { leadId: string; content: string }) =>
      pipelineService.addNote(leadId, content),
    onSuccess: refreshLeads,
  })

  return {
    definition: definition.data ?? emptyDefinition,
    agents: agents.data ?? [],
    contacts: contacts.data ?? [],
    leads: rows,
    filteredLeads: rows,
    filters,
    selectedLead,
    isLoading: definition.isPending || leads.isPending,
    error: definition.error ?? leads.error ?? null,
    patchFilters: (patch: Partial<PipelineFilters>) =>
      setFilters((current) => ({ ...current, ...patch })),
    clearFilters: () => setFilters(initialFilters),
    selectLead: setSelectedId,
    moveLead: (leadId: string, stageId: LeadStageId) =>
      move.mutateAsync({ leadId, stageId }),
    createLead: (draft: LeadDraft) => create.mutateAsync(draft),
    updateLead: (leadId: string, draft: LeadDraft) =>
      update.mutateAsync({ leadId, draft }),
    addNote: (leadId: string, content: string) =>
      note.mutateAsync({ leadId, content }),
  }
}
