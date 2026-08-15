import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { DuplicateApplicantException } from '../../../core/exceptions/admissions.exceptions';
import {
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { ApplicantInputDto } from '../admissions/dto/applicant-input.dto';
import type { DuplicateResolutionDto } from '../admissions/dto/duplicate-resolution.dto';
import type { ArchiveApplicantDto } from './dto/archive-applicant.dto';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { ApplicantPolicy } from './applicant.policy';
import { ApplicantRepository } from './applicant.repository';

const rules = {
  minorAge: 18,
  minimumGraduationAge: 16,
  nationalIdPattern: '^\\d{14}$',
  phonePattern: '^01\\d{9}$',
};

@Injectable()
export class ApplicantService {
  constructor(
    private readonly repository: ApplicantRepository,
    private readonly policy: ApplicantPolicy,
    private readonly transactions: TransactionManager,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
  ) {}

  async duplicates(organizationId: string, input: ApplicantInputDto) {
    const normalized = this.policy.validate(input, rules);
    const qualification = await this.organization.resolveValue(
      'qualifications',
      input.qualificationId,
    );
    if (!qualification?.active) throw new NotFoundException();
    const rows = await this.repository.findDuplicateCandidates(
      organizationId,
      normalized,
    );
    return rows.map((row) => ({
      applicantId: row.id,
      label: `${row.fullName} — ${row.primaryPhone}`,
      reasons: [
        ...(normalized.normalizedNationalId &&
        row.normalizedNationalId === normalized.normalizedNationalId
          ? ['same-national-id']
          : []),
        ...(row.normalizedPrimaryPhone === normalized.normalizedPrimaryPhone
          ? ['same-phone']
          : []),
      ],
    }));
  }

  async resolveForCreate(
    organizationId: string,
    input: ApplicantInputDto,
    resolution: DuplicateResolutionDto | undefined,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const normalized = this.policy.validate(input, rules);
    const qualification = await this.organization.resolveValue(
      'qualifications',
      input.qualificationId,
    );
    if (!qualification?.active) throw new NotFoundException();
    const duplicates = await this.repository.findDuplicateCandidates(
      organizationId,
      normalized,
      tx,
    );
    if (resolution?.outcome === 'use-existing') {
      const selected = duplicates.find(
        (row) => row.id === resolution.applicantId,
      );
      if (!selected) throw new DuplicateApplicantException();
      return selected;
    }
    if (duplicates.length && resolution?.outcome !== 'create-exception')
      throw new DuplicateApplicantException();
    return this.repository.create(
      {
        organizationId,
        fullName: normalized.fullName,
        normalizedFullName: normalized.normalizedFullName,
        primaryPhone: normalized.primaryPhone,
        normalizedPrimaryPhone: normalized.normalizedPrimaryPhone,
        guardianPhone: normalized.guardianPhone,
        normalizedGuardianPhone: normalized.normalizedGuardianPhone,
        nationalId: normalized.nationalId,
        normalizedNationalId: normalized.normalizedNationalId,
        alternativeIdentityReason: input.alternativeIdentityReason?.trim(),
        address: input.address.trim(),
        dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
        qualificationId: input.qualificationId,
        qualificationLabel: qualification.label,
        graduationYear: input.graduationYear,
        privateNotes: input.notes?.trim(),
        createdBy: actorId,
        updatedBy: actorId,
      },
      tx,
    );
  }

  async updateForAdmission(
    organizationId: string,
    applicantId: string,
    input: ApplicantInputDto,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const current = await this.repository.findById(
      applicantId,
      organizationId,
      tx,
    );
    if (!current) throw new NotFoundException();
    const normalized = this.policy.validate(input, rules);
    const qualification = await this.organization.resolveValue(
      'qualifications',
      input.qualificationId,
    );
    if (!qualification?.active) throw new NotFoundException();
    const updated = await this.repository.updateCompareAndSwap(
      applicantId,
      organizationId,
      current.version,
      {
        fullName: normalized.fullName,
        normalizedFullName: normalized.normalizedFullName,
        primaryPhone: normalized.primaryPhone,
        normalizedPrimaryPhone: normalized.normalizedPrimaryPhone,
        guardianPhone: normalized.guardianPhone,
        normalizedGuardianPhone: normalized.normalizedGuardianPhone,
        nationalId: normalized.nationalId,
        normalizedNationalId: normalized.normalizedNationalId,
        alternativeIdentityReason: input.alternativeIdentityReason?.trim(),
        address: input.address.trim(),
        dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
        qualificationId: input.qualificationId,
        qualificationLabel: qualification.label,
        graduationYear: input.graduationYear,
        privateNotes: input.notes?.trim(),
        updatedBy: actorId,
      },
      tx,
    );
    if (updated.count !== 1)
      throw new VersionConflictException(current.version);
  }

  async archive(
    organizationId: string,
    applicantId: string,
    dto: ArchiveApplicantDto,
    actorId: string,
  ) {
    const current = await this.repository.findById(applicantId, organizationId);
    if (!current) throw new NotFoundException();
    await this.transactions.runSerializable(async (tx) => {
      const result = await this.repository.archiveCompareAndSwap(
        applicantId,
        organizationId,
        dto.expectedVersion,
        dto.reason,
        actorId,
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
    });
    const updated = await this.repository.findById(applicantId, organizationId);
    if (!updated) throw new NotFoundException();
    return updated;
  }
}
