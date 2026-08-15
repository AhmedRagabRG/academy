import { httpClient } from "@/shared/api"

export type DocumentPolicyModule = "admissions" | "students"

export interface DocumentRequirement {
  stableKey: string
  label: string
  /** Whether the document is asked for at all. */
  enabled: boolean
  /** Whether it must be present, not merely offered. */
  required: boolean
  requiredAt: "submission" | "approval"
  multiple: boolean
  allowedMimeTypes: string[]
  maximumBytes: number
  displayOrder: number
}

export interface DocumentRequirementPolicy {
  id: string
  module: DocumentPolicyModule
  offeringId: string | null
  version: number
  /** True when this offering has no list of its own and follows the default. */
  inherited: boolean
  requirements: DocumentRequirement[]
}

/**
 * Settings for the document lists Admissions and Students ask for.
 *
 * There is no mock counterpart: this screen exists only to edit rows the API
 * owns, so a fixture version would have nothing meaningful to show.
 */
export const documentRequirementsService = {
  get(
    module: DocumentPolicyModule,
    offeringId?: string,
    signal?: AbortSignal
  ): Promise<DocumentRequirementPolicy> {
    return httpClient.get<DocumentRequirementPolicy>(
      "/settings/document-requirements",
      { module, ...(offeringId ? { offeringId } : {}) },
      signal
    )
  },

  update(input: {
    module: DocumentPolicyModule
    offeringId?: string
    expectedVersion: number
    requirements: DocumentRequirement[]
  }): Promise<DocumentRequirementPolicy> {
    return httpClient.put<DocumentRequirementPolicy>(
      "/settings/document-requirements",
      {
        module: input.module,
        ...(input.offeringId ? { offeringId: input.offeringId } : {}),
        expectedVersion: input.expectedVersion,
        requirements: input.requirements.map((requirement, index) => ({
          stableKey: requirement.stableKey,
          label: requirement.label,
          enabled: requirement.enabled,
          required: requirement.required,
          requiredAt: requirement.requiredAt,
          multiple: requirement.multiple,
          allowedMimeTypes: requirement.allowedMimeTypes,
          maximumBytes: requirement.maximumBytes,
          displayOrder: index,
        })),
      }
    )
  },
}
