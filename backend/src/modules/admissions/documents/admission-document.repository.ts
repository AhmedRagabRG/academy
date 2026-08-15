import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions';
import type { FileDescriptor } from '../../../shared/types/file-descriptor';
import type {
  AdmissionDocumentDecisionValue,
  AdmissionDocumentState,
  DocumentDecisionEvidence,
  DocumentRequirementRule,
  DocumentVersionEvidence,
} from './admission-document.policy';
import {
  deriveAdmissionDocumentState,
  validateRequirementFile,
} from './admission-document.policy';

/**
 * The requirement as published to clients.
 *
 * A client renders the Arabic label, marks the card required or optional, and
 * bounds its file picker from these — sending only the key left every card
 * showing the raw `birth-certificate` with a 0 MB limit.
 */
export interface AdmissionDocumentRequirementRecord {
  id: string;
  key: string;
  label: string;
  required: boolean;
  requiredAt: 'submission' | 'approval';
  allowedMimeTypes: string[];
  maxBytes: number;
}

export interface AdmissionDocumentRecord {
  id: string;
  admissionId: string;
  requirementId: string;
  requirementKey: string;
  requirement: AdmissionDocumentRequirementRecord | null;
  state: AdmissionDocumentState;
  currentVersion: DocumentVersionRecord | null;
  version: number;
}

export interface DocumentVersionRecord extends DocumentVersionEvidence {
  documentId: string;
  storageFile: FileDescriptor;
  originalName: string;
  decisions: readonly DocumentDecisionEvidence[];
  uploadedAt: Date;
}

export interface StoreDocumentVersionCommand {
  admissionId: string;
  documentId?: string;
  requirementId: string;
  expectedVersion: number;
  idempotencyKey: string;
  storageFile: FileDescriptor;
  actorId: string;
}

export interface DecideDocumentCommand {
  admissionId: string;
  documentId: string;
  versionId: string;
  expectedVersion: number;
  decision: AdmissionDocumentDecisionValue;
  reason?: string;
  reviewerId: string;
  reviewerName: string;
}

export interface WithdrawDocumentCommand {
  admissionId: string;
  documentId: string;
  versionId: string;
  expectedVersion: number;
  reason?: string;
  actorId: string;
}

/** Persistence boundary implemented against Prisma by the Admissions data layer. */
@Injectable()
export abstract class AdmissionDocumentRepository {
  abstract list(admissionId: string): Promise<AdmissionDocumentRecord[]>;
  abstract findDocument(
    admissionId: string,
    documentId: string,
  ): Promise<AdmissionDocumentRecord | null>;
  abstract findRequirement(
    admissionId: string,
    requirementId: string,
  ): Promise<DocumentRequirementRule | null>;
  abstract findByIdempotencyKey(
    admissionId: string,
    idempotencyKey: string,
  ): Promise<DocumentVersionRecord | null>;
  abstract storeVersion(
    command: StoreDocumentVersionCommand,
  ): Promise<AdmissionDocumentRecord>;
  abstract withdraw(
    command: WithdrawDocumentCommand,
  ): Promise<AdmissionDocumentRecord>;
  abstract decide(
    command: DecideDocumentCommand,
  ): Promise<AdmissionDocumentRecord>;
  abstract versions(
    admissionId: string,
    documentId: string,
  ): Promise<DocumentVersionRecord[]>;
  abstract refreshPolicy(command: {
    admissionId: string;
    expectedVersion: number;
    sourcePolicyId: string;
    sourcePolicyVersion: number;
    requirements: readonly DocumentRequirementRule[];
    actorId: string;
  }): Promise<AdmissionDocumentRecord[]>;
}

const documentInclude = {
  currentVersion: {
    include: {
      decisions: {
        orderBy: [{ decidedAt: 'asc' as const }, { id: 'asc' as const }],
      },
    },
  },
  currentRequirement: true,
} satisfies Prisma.AdmissionDocumentInclude;

type LoadedDocument = Prisma.AdmissionDocumentGetPayload<{
  include: typeof documentInclude;
}>;

function fileDescriptor(value: Prisma.JsonValue): FileDescriptor {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    typeof value.id !== 'string' ||
    typeof value.fileName !== 'string' ||
    typeof value.originalName !== 'string' ||
    typeof value.mimeType !== 'string' ||
    typeof value.size !== 'number' ||
    typeof value.url !== 'string'
  ) {
    throw new Error('Invalid persisted file descriptor');
  }
  return {
    id: value.id,
    fileName: value.fileName,
    originalName: value.originalName,
    mimeType: value.mimeType,
    size: value.size,
    url: value.url,
  };
}

function mapVersion(
  value: NonNullable<LoadedDocument['currentVersion']>,
): DocumentVersionRecord {
  return {
    id: value.id,
    documentId: value.documentId,
    status: value.status.toLowerCase() as DocumentVersionRecord['status'],
    mimeType: value.mimeType,
    byteSize: value.byteSize,
    versionNumber: value.versionNumber,
    storageFile: fileDescriptor(value.fileDescriptor),
    originalName: value.originalName,
    uploadedAt: value.uploadedAt,
    decisions: value.decisions.map((decision) => ({
      decision:
        decision.decision.toLowerCase() as AdmissionDocumentDecisionValue,
      reason: decision.reason,
      decidedAt: decision.decidedAt,
    })),
  };
}

function mapDocument(value: LoadedDocument): AdmissionDocumentRecord {
  const currentVersion = value.currentVersion
    ? mapVersion(value.currentVersion)
    : null;
  const latestDecision = currentVersion?.decisions.at(-1);
  const requirement = value.currentRequirement;
  return {
    id: value.id,
    admissionId: value.admissionId,
    requirementId: value.currentRequirementId,
    requirementKey: value.requirementKey,
    requirement: requirement
      ? {
          id: requirement.id,
          key: requirement.stableKey,
          label: requirement.label,
          required: requirement.required,
          // The stage the document must exist by: everything that is not owed
          // at submission is owed at approval.
          requiredAt:
            requirement.requiredAtStage === 'SUBMITTED'
              ? 'submission'
              : 'approval',
          allowedMimeTypes: requirement.allowedMimeTypes,
          maxBytes: requirement.maximumBytes,
        }
      : null,
    currentVersion,
    state: deriveAdmissionDocumentState({ currentVersion, latestDecision }),
    version: value.version,
  };
}

@Injectable()
export class PrismaAdmissionDocumentRepository extends AdmissionDocumentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(admissionId: string): Promise<AdmissionDocumentRecord[]> {
    const records = await this.prisma.admissionDocument.findMany({
      where: { admissionId },
      orderBy: [{ requirementKey: 'asc' }, { id: 'asc' }],
      include: documentInclude,
    });
    return records.map(mapDocument);
  }

  async currentPolicyDefinition(admissionId: string) {
    const snapshot =
      await this.prisma.admissionDocumentPolicySnapshot.findFirst({
        where: { admissionId, currentForAdmission: { id: admissionId } },
        include: { requirements: { orderBy: { stableKey: 'asc' } } },
      });
    if (!snapshot) throw new NotFoundException();
    return {
      id: snapshot.sourcePolicyId,
      version: snapshot.sourcePolicyVersion,
      requirements: snapshot.requirements.map((requirement) => ({
        id: requirement.id,
        stableKey: requirement.stableKey,
        required: requirement.required,
        allowedMimeTypes: requirement.allowedMimeTypes,
        maximumBytes: requirement.maximumBytes,
      })),
    };
  }

  async findDocument(admissionId: string, documentId: string) {
    const record = await this.prisma.admissionDocument.findFirst({
      where: { id: documentId, admissionId },
      include: documentInclude,
    });
    return record ? mapDocument(record) : null;
  }

  async findRequirement(admissionId: string, requirementId: string) {
    const requirement =
      await this.prisma.admissionDocumentPolicyRequirement.findFirst({
        where: {
          id: requirementId,
          snapshot: { admissionId, currentForAdmission: { id: admissionId } },
        },
      });
    return requirement
      ? {
          id: requirement.id,
          stableKey: requirement.stableKey,
          required: requirement.required,
          allowedMimeTypes: requirement.allowedMimeTypes,
          maximumBytes: requirement.maximumBytes,
        }
      : null;
  }

  async findByIdempotencyKey(admissionId: string, idempotencyKey: string) {
    const version = await this.prisma.admissionDocumentVersion.findFirst({
      where: { idempotencyKey, document: { admissionId } },
      include: {
        decisions: { orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }] },
      },
    });
    return version ? mapVersion(version) : null;
  }

  storeVersion(command: StoreDocumentVersionCommand) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await this.lockAdmission(
        command.admissionId,
        command.expectedVersion,
        tx,
      );
      const requirement = await tx.admissionDocumentPolicyRequirement.findFirst(
        {
          where: {
            id: command.requirementId,
            snapshot: {
              admissionId: command.admissionId,
              currentForAdmission: { id: command.admissionId },
            },
          },
        },
      );
      if (!requirement) throw new NotFoundException();
      const document = command.documentId
        ? await tx.admissionDocument.findFirst({
            where: { id: command.documentId, admissionId: command.admissionId },
          })
        : await tx.admissionDocument.findUnique({
            where: {
              admissionId_requirementKey: {
                admissionId: command.admissionId,
                requirementKey: requirement.stableKey,
              },
            },
          });
      if (!document) throw new NotFoundException();
      const replay = await tx.admissionDocumentVersion.findFirst({
        where: {
          documentId: document.id,
          idempotencyKey: command.idempotencyKey,
        },
      });
      if (replay) {
        const loaded = await tx.admissionDocument.findUniqueOrThrow({
          where: { id: document.id },
          include: documentInclude,
        });
        return mapDocument(loaded);
      }
      const latest = await tx.admissionDocumentVersion.aggregate({
        where: { documentId: document.id },
        _max: { versionNumber: true },
      });
      const version = await tx.admissionDocumentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: (latest._max.versionNumber ?? 0) + 1,
          storageFileId: command.storageFile.id,
          fileDescriptor: {
            id: command.storageFile.id,
            fileName: command.storageFile.fileName,
            originalName: command.storageFile.originalName,
            mimeType: command.storageFile.mimeType,
            size: command.storageFile.size,
            url: command.storageFile.url,
          },
          originalName: command.storageFile.originalName,
          mimeType: command.storageFile.mimeType,
          byteSize: command.storageFile.size,
          idempotencyKey: command.idempotencyKey,
          uploadedBy: command.actorId,
        },
      });
      await tx.admissionDocument.update({
        where: { id: document.id },
        data: {
          currentVersionId: version.id,
          currentRequirementId: requirement.id,
          version: { increment: 1 },
          updatedBy: command.actorId,
        },
      });
      await this.timeline(
        tx,
        command.admissionId,
        'DOCUMENT_UPLOADED',
        admission.version,
        command.actorId,
        {
          documentId: document.id,
          documentVersionId: version.id,
          requirementKey: requirement.stableKey,
        },
      );
      const loaded = await tx.admissionDocument.findUniqueOrThrow({
        where: { id: document.id },
        include: documentInclude,
      });
      return mapDocument(loaded);
    });
  }

  withdraw(command: WithdrawDocumentCommand) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await this.lockAdmission(
        command.admissionId,
        command.expectedVersion,
        tx,
      );
      const version = await tx.admissionDocumentVersion.findFirst({
        where: {
          id: command.versionId,
          documentId: command.documentId,
          document: { admissionId: command.admissionId },
        },
      });
      if (!version) throw new NotFoundException();
      await tx.admissionDocumentVersion.update({
        where: { id: version.id },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          withdrawnBy: command.actorId,
          withdrawalReason: command.reason,
        },
      });
      await tx.admissionDocument.update({
        where: { id: command.documentId },
        data: { version: { increment: 1 }, updatedBy: command.actorId },
      });
      await this.timeline(
        tx,
        command.admissionId,
        'DOCUMENT_WITHDRAWN',
        admission.version,
        command.actorId,
        { documentId: command.documentId, documentVersionId: version.id },
      );
      const loaded = await tx.admissionDocument.findUniqueOrThrow({
        where: { id: command.documentId },
        include: documentInclude,
      });
      return mapDocument(loaded);
    });
  }

  decide(command: DecideDocumentCommand) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await this.lockAdmission(
        command.admissionId,
        command.expectedVersion,
        tx,
      );
      const version = await tx.admissionDocumentVersion.findFirst({
        where: {
          id: command.versionId,
          documentId: command.documentId,
          status: 'AVAILABLE',
          document: { admissionId: command.admissionId },
        },
      });
      if (!version) throw new NotFoundException();
      await tx.admissionDocumentDecision.create({
        data: {
          documentVersionId: version.id,
          decision: command.decision === 'verified' ? 'VERIFIED' : 'REJECTED',
          reason: command.reason,
          reviewerId: command.reviewerId,
          reviewerName: command.reviewerName,
          sourceAdmissionVersion: admission.version + 1,
        },
      });
      await tx.admissionDocument.update({
        where: { id: command.documentId },
        data: { version: { increment: 1 }, updatedBy: command.reviewerId },
      });
      await this.timeline(
        tx,
        command.admissionId,
        command.decision === 'verified'
          ? 'DOCUMENT_VERIFIED'
          : 'DOCUMENT_REJECTED',
        admission.version,
        command.reviewerId,
        { documentId: command.documentId, documentVersionId: version.id },
      );
      const loaded = await tx.admissionDocument.findUniqueOrThrow({
        where: { id: command.documentId },
        include: documentInclude,
      });
      return mapDocument(loaded);
    });
  }

  async versions(admissionId: string, documentId: string) {
    const versions = await this.prisma.admissionDocumentVersion.findMany({
      where: { documentId, document: { admissionId } },
      include: {
        decisions: { orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ versionNumber: 'asc' }, { id: 'asc' }],
    });
    return versions.map(mapVersion);
  }

  refreshPolicy(
    command: Parameters<AdmissionDocumentRepository['refreshPolicy']>[0],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const admission = await this.lockAdmission(
        command.admissionId,
        command.expectedVersion,
        tx,
      );
      const latest = await tx.admissionDocumentPolicySnapshot.aggregate({
        where: { admissionId: command.admissionId },
        _max: { snapshotVersion: true },
      });
      const snapshot = await tx.admissionDocumentPolicySnapshot.create({
        data: {
          admissionId: command.admissionId,
          sourcePolicyId: command.sourcePolicyId,
          sourcePolicyVersion: command.sourcePolicyVersion,
          snapshotVersion: (latest._max.snapshotVersion ?? 0) + 1,
          createdBy: command.actorId,
          requirements: {
            create: command.requirements.map((requirement) => ({
              stableKey: requirement.stableKey,
              label: requirement.stableKey,
              required: requirement.required,
              requiredAtStage: 'SUBMITTED',
              allowedMimeTypes: [...requirement.allowedMimeTypes],
              maximumBytes: requirement.maximumBytes,
              sourceRequirementId: requirement.id,
            })),
          },
        },
        include: { requirements: true },
      });
      for (const requirement of snapshot.requirements) {
        const sourceRequirement = command.requirements.find(
          (candidate) => candidate.stableKey === requirement.stableKey,
        );
        if (!sourceRequirement) throw new NotFoundException();
        const existing = await tx.admissionDocument.findUnique({
          where: {
            admissionId_requirementKey: {
              admissionId: command.admissionId,
              requirementKey: requirement.stableKey,
            },
          },
          include: { currentVersion: true },
        });
        const currentStillSatisfies =
          !existing?.currentVersion ||
          validateRequirementFile(sourceRequirement, {
            mimeType: existing.currentVersion.mimeType,
            size: existing.currentVersion.byteSize,
          }) === null;
        await tx.admissionDocument.upsert({
          where: {
            admissionId_requirementKey: {
              admissionId: command.admissionId,
              requirementKey: requirement.stableKey,
            },
          },
          create: {
            admissionId: command.admissionId,
            requirementKey: requirement.stableKey,
            currentRequirementId: requirement.id,
            createdBy: command.actorId,
            updatedBy: command.actorId,
          },
          update: {
            currentRequirementId: requirement.id,
            ...(!currentStillSatisfies ? { currentVersionId: null } : {}),
            version: { increment: 1 },
            updatedBy: command.actorId,
          },
        });
      }
      await tx.admission.update({
        where: { id: command.admissionId },
        data: { currentDocumentPolicySnapshotId: snapshot.id },
      });
      await this.timeline(
        tx,
        command.admissionId,
        'POLICY_REFRESHED',
        admission.version,
        command.actorId,
        { documentPolicySnapshotId: snapshot.id },
      );
      const records = await tx.admissionDocument.findMany({
        where: { admissionId: command.admissionId },
        orderBy: [{ requirementKey: 'asc' }, { id: 'asc' }],
        include: documentInclude,
      });
      return records.map(mapDocument);
    });
  }

  private async lockAdmission(
    admissionId: string,
    expectedVersion: number,
    tx: Prisma.TransactionClient,
  ) {
    const admission = await tx.admission.findUnique({
      where: { id: admissionId },
      select: { id: true, version: true },
    });
    if (!admission) throw new NotFoundException();
    if (admission.version !== expectedVersion)
      throw new VersionConflictException(admission.version);
    const changed = await tx.admission.updateMany({
      where: { id: admissionId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (changed.count !== 1) {
      const current = await tx.admission.findUniqueOrThrow({
        where: { id: admissionId },
        select: { version: true },
      });
      throw new VersionConflictException(current.version);
    }
    return admission;
  }

  private async timeline(
    tx: Prisma.TransactionClient,
    admissionId: string,
    kind: Prisma.AdmissionTimelineEventCreateInput['kind'],
    sourceVersion: number,
    actorId: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await tx.admissionTimelineEvent.create({
      data: {
        admissionId,
        kind,
        sourceAdmissionVersion: sourceVersion,
        resultAdmissionVersion: sourceVersion + 1,
        actorId,
        actorName: actorId,
        metadata,
      },
    });
  }
}
