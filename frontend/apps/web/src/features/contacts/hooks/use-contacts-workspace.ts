"use client"

import { useMemo, useState } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { contactsService } from "../services/active-contacts-service"
import { contactsKeys } from "../services/contacts-query-keys"
import type { ContactsListQuery } from "../services/contacts-service"
import type {
  ContactDraft,
  ContactSource,
  CustomFieldType,
} from "../types/domain"

const emptyDraft: ContactDraft = {
  name: "",
  phone: "",
  email: "",
  company: "",
  role: "",
}

const PAGE_SIZE = 50

export function useContactsWorkspace(initialContactId?: string) {
  const client = useQueryClient()
  const [query, setQuery] = useState("")
  const [source, setSource] = useState<ContactSource | "all">("all")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialContactId ?? null
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const listQuery: ContactsListQuery = {
    search: query,
    source,
    groupIds: [],
    limit: PAGE_SIZE,
  }

  const list = useInfiniteQuery({
    queryKey: contactsKeys.list(listQuery),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      contactsService.list({ ...listQuery, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor,
  })

  const lookups = useQuery({
    queryKey: contactsKeys.lookups,
    queryFn: ({ signal }) => contactsService.lookups(signal),
    staleTime: Infinity,
  })

  const contacts = useMemo(
    () => list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data]
  )
  const total = list.data?.pages[0]?.total ?? 0
  const groups = lookups.data?.groups ?? []
  const customFields = lookups.data?.customFields ?? []

  /**
   * The list is already narrowed by the server, so the two collections are the
   * same rows. Both names are kept because the screen distinguishes "how many
   * exist" from "how many are on screen".
   */
  const filteredContacts = contacts

  const selectedContact =
    contacts.find((contact) => contact.id === selectedId) ?? contacts[0] ?? null

  const refreshList = () =>
    client.invalidateQueries({ queryKey: contactsKeys.lists() })
  const refreshLookups = () =>
    client.invalidateQueries({ queryKey: contactsKeys.lookups })

  const createContact = useMutation({
    mutationFn: (draft: ContactDraft) => contactsService.create(draft),
    onSuccess: async (contact) => {
      setSelectedId(contact.id)
      await refreshList()
    },
  })

  const importContacts = useMutation({
    mutationFn: (rows: ContactDraft[]) => contactsService.importContacts(rows),
    onSuccess: refreshList,
  })

  const updateContact = useMutation({
    mutationFn: ({
      id,
      draft,
      expectedVersion,
    }: {
      id: string
      draft: ContactDraft
      expectedVersion?: number
    }) => contactsService.update(id, draft, expectedVersion),
    onSuccess: refreshList,
  })

  const removeContact = useMutation({
    mutationFn: (id: string) => contactsService.remove(id),
    onSuccess: async (_result, id) => {
      setSelectedId((current) => (current === id ? null : current))
      setSelectedIds((current) => current.filter((value) => value !== id))
      await refreshList()
    },
  })

  const addNote = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      contactsService.addNote(id, content),
    onSuccess: refreshList,
  })

  const toggleGroup = useMutation({
    mutationFn: ({ id, groupId }: { id: string; groupId: string }) =>
      contactsService.toggleGroup(id, groupId),
    onSuccess: refreshList,
  })

  const setCustomValue = useMutation({
    mutationFn: ({
      id,
      fieldId,
      value,
    }: {
      id: string
      fieldId: string
      value: string
    }) => contactsService.setCustomValue(id, fieldId, value),
    onSuccess: refreshList,
  })

  const createGroup = useMutation({
    mutationFn: ({
      name,
      description,
    }: {
      name: string
      description: string
    }) => contactsService.createGroup(name, description),
    onSuccess: refreshLookups,
  })

  const createCustomField = useMutation({
    mutationFn: ({ label, type }: { label: string; type: CustomFieldType }) =>
      contactsService.createCustomField(label, type),
    onSuccess: refreshLookups,
  })

  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((contactId) => contactId !== id)
        : [...current, id]
    )

  const toggleAllVisible = () => {
    const visibleIds = filteredContacts.map((contact) => contact.id)
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id))
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    )
  }

  return {
    contacts,
    filteredContacts,
    total,
    groups,
    customFields,
    owners: lookups.data?.owners ?? [],
    selectedContact,
    selectedIds,
    query,
    source,
    emptyDraft,
    isLoading: list.isPending || lookups.isPending,
    error: list.error ?? lookups.error ?? null,
    hasMore: list.hasNextPage,
    isLoadingMore: list.isFetchingNextPage,
    loadMore: () => void list.fetchNextPage(),
    setQuery,
    setSource,
    selectContact: setSelectedId,
    createContact: (draft: ContactDraft) => createContact.mutateAsync(draft),
    importContacts: async (rows: ContactDraft[]) =>
      (await importContacts.mutateAsync(rows)).imported,
    updateContact: (
      id: string,
      draft: ContactDraft,
      expectedVersion?: number
    ) => updateContact.mutateAsync({ id, draft, expectedVersion }),
    removeContact: (id: string) => removeContact.mutateAsync(id),
    addNote: (id: string, content: string) =>
      addNote.mutateAsync({ id, content }),
    createCustomField: (label: string, type: CustomFieldType) =>
      createCustomField.mutateAsync({ label, type }),
    setCustomValue: (id: string, fieldId: string, value: string) =>
      setCustomValue.mutateAsync({ id, fieldId, value }),
    createGroup: (name: string, description: string) =>
      createGroup.mutateAsync({ name, description }),
    toggleGroup: (id: string, groupId: string) =>
      toggleGroup.mutateAsync({ id, groupId }),
    exportCsv: () => contactsService.exportCsv(listQuery),
    toggleSelected,
    toggleAllVisible,
  }
}
