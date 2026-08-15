import { Injectable } from '@nestjs/common';
import type {
  AdmissionStatus,
  DocumentPolicyModule,
  Prisma,
} from '../../../../prisma/generated/client';
import { VersionConflictException } from '../../../core/exceptions';
import { PrismaService } from '../../../database/prisma.service';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationProfileService } from '../profile/organization-profile.service';
import type {
  DocumentPolicyModuleValue,
  DocumentRequirementInputDto,
  UpdateDocumentRequirementsDto,
} from './dto/document-requirement.dto';

const MODULES: Record<DocumentPolicyModuleValue, DocumentPolicyModule> = {
  admissions: 'ADMISSIONS',
  students: 'STUDENTS',
};

/** Only these two admission stages can gate a document. */
const STAGES: Record<string, AdmissionStatus> = {
  submission: 'SUBMITTED',
  approval: 'APPROVED',
};

export interface ResolvedRequirement {
  stableKey: string;
  label: string;
  enabled: boolean;
  required: boolean;
  requiredAt: 'submission' | 'approval';
  multiple: boolean;
  allowedMimeTypes: string[];
  maximumBytes: number;
  displayOrder: number;
}

export interface ResolvedPolicy {
  id: string;
  module: DocumentPolicyModuleValue;
  offeringId: string | null;
  version: number;
  /** True when no override exists and the organization default was returned. */
  inherited: boolean;
  requirements: ResolvedRequirement[];
}

@Injectable()
export class DocumentRequirementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profile: OrganizationProfileService,
    private readonly transactions: TransactionManager,
  ) {}

  private organizationId(): Promise<string> {
    return this.profile.get().then((row) => row.organizationId);
  }

  /**
   * Resolves the list that actually governs a module, falling back from an
   * offering's override to the organization default. The fallback is why the
   * response reports `inherited` — an editor has to be able to tell "this
   * offering has its own list" from "this offering follows the default".
   */
  async resolve(
    module: DocumentPolicyModuleValue,
    offeringId?: string,
  ): Promise<ResolvedPolicy | null> {
    const organizationId = await this.organizationId();
    const prismaModule = MODULES[module];

    const override = offeringId
      ? await this.load(organizationId, prismaModule, offeringId)
      : null;
    if (override) return this.present(override, module, false);

    const fallback = await this.load(organizationId, prismaModule, null);
    return fallback ? this.present(fallback, module, Boolean(offeringId)) : null;
  }

  private load(
    organizationId: string,
    module: DocumentPolicyModule,
    offeringId: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).documentRequirementPolicy.findFirst({
      where: { organizationId, module, offeringId },
      include: { requirements: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  private present(
    row: NonNullable<Awaited<ReturnType<DocumentRequirementService['load']>>>,
    module: DocumentPolicyModuleValue,
    inherited: boolean,
  ): ResolvedPolicy {
    return {
      id: row.id,
      module,
      offeringId: row.offeringId,
      version: row.version,
      inherited,
      requirements: row.requirements.map((requirement) => ({
        stableKey: requirement.stableKey,
        label: requirement.label,
        enabled: requirement.enabled,
        required: requirement.required,
        requiredAt:
          requirement.requiredAtStage === 'SUBMITTED' ? 'submission' : 'approval',
        multiple: requirement.multiple,
        allowedMimeTypes: requirement.allowedMimeTypes,
        maximumBytes: requirement.maximumBytes,
        displayOrder: requirement.displayOrder,
      })),
    };
  }

  /**
   * Replaces a policy's list wholesale.
   *
   * The whole list is written at once rather than per-row because the editor
   * presents it as one grid — a partial write would let "enabled" on one type
   * and "required" on another land in different versions. Bumping `version` is
   * what an admission's stored snapshot compares against, so an existing draft
   * can pick the change up through the refresh-policy route.
   */
  async update(
    caller: CallerContext,
    dto: UpdateDocumentRequirementsDto,
  ): Promise<ResolvedPolicy> {
    const organizationId = await this.organizationId();
    const module = MODULES[dto.module];
    const offeringId = dto.offeringId ?? null;

    await this.transactions.run(async (tx) => {
      const existing = await this.load(organizationId, module, offeringId, tx);

      // An offering that has never been customized starts from the default's
      // version, so the first override write is not refused as a conflict.
      if (existing && existing.version !== dto.expectedVersion)
        throw new VersionConflictException(existing.version);

      const policy = existing
        ? await tx.documentRequirementPolicy.update({
            where: { id: existing.id },
            data: { version: existing.version + 1, updatedById: caller.accountId },
          })
        : await tx.documentRequirementPolicy.create({
            data: {
              organizationId,
              module,
              offeringId,
              version: 1,
              updatedById: caller.accountId,
            },
          });

      await tx.documentRequirementDefinition.deleteMany({
        where: { policyId: policy.id },
      });
      await tx.documentRequirementDefinition.createMany({
        data: dto.requirements.map((requirement, index) =>
          this.toRow(policy.id, requirement, index),
        ),
      });
    });

    const written = await this.resolve(dto.module, dto.offeringId);
    // The row was just written in this transaction, so its absence would be a
    // fault rather than a missing-policy case.
    if (!written) throw new VersionConflictException(dto.expectedVersion);
    return written;
  }

  private toRow(
    policyId: string,
    requirement: DocumentRequirementInputDto,
    index: number,
  ) {
    return {
      policyId,
      stableKey: requirement.stableKey,
      label: requirement.label.trim(),
      enabled: requirement.enabled,
      required: requirement.required,
      requiredAtStage: STAGES[requirement.requiredAt ?? 'approval'] ?? null,
      multiple: requirement.multiple ?? false,
      allowedMimeTypes: requirement.allowedMimeTypes,
      maximumBytes: requirement.maximumBytes,
      displayOrder: requirement.displayOrder ?? index,
    };
  }

  /** Drops an offering's override so it follows the organization default again. */
  async clearOverride(
    module: DocumentPolicyModuleValue,
    offeringId: string,
  ): Promise<void> {
    const organizationId = await this.organizationId();
    await this.prisma.documentRequirementPolicy.deleteMany({
      where: { organizationId, module: MODULES[module], offeringId },
    });
  }
}
