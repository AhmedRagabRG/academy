import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdmissionMoneyResponseDto {
  @ApiProperty({ example: '18000.00' }) amount!: string;
  @ApiProperty({ example: 'EGP' }) currency!: string;
  @ApiProperty({ example: 2 }) precision!: number;
}

export class AdmissionListItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'ADM-2026-00042' }) reference!: string;
  @ApiProperty() applicantName!: string;
  @ApiProperty({ example: '•••••••5678' }) phoneHint!: string;
  @ApiProperty() offeringLabel!: string;
  @ApiPropertyOptional() batchLabel?: string;
  @ApiProperty() registrationBranchLabel!: string;
  @ApiProperty() studyBranchLabel!: string;
  @ApiProperty({
    enum: [
      'draft',
      'submitted',
      'under-review',
      'approved',
      'rejected',
      'enrolled',
      'archived',
    ],
  })
  status!: string;
  @ApiProperty() version!: number;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: Object }) permissions!: Record<string, boolean>;
}

export class AdmissionResponseDto extends AdmissionListItemResponseDto {
  @ApiProperty({ type: Object }) applicant!: Record<string, unknown>;
  @ApiProperty({ type: Object }) assignment!: Record<string, unknown>;
  @ApiPropertyOptional({ type: Object }) selection?: Record<string, unknown>;
  @ApiPropertyOptional({ type: Object }) financial?: Record<string, unknown>;
  @ApiProperty({ type: Object }) requirementSnapshot!: Record<string, unknown>;
  @ApiProperty({ type: [Object] }) documents!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) lifecycle!: Record<string, unknown>[];
  @ApiProperty({ type: [String] }) availableActions!: string[];
}

export class AdmissionReadinessResponseDto {
  @ApiProperty() ready!: boolean;
  @ApiProperty({ enum: ['submit', 'approve'] }) action!: string;
  @ApiProperty() admissionVersion!: number;
  @ApiProperty({ type: [Object] }) findings!: Record<string, unknown>[];
}

export class BulkAdmissionStatusResponseDto {
  @ApiProperty({ format: 'uuid' }) admissionId!: string;
  @ApiProperty() success!: boolean;
  @ApiPropertyOptional() message?: string;
}

export class AdmissionEnrollmentReadinessResponseDto {
  @ApiProperty() ready!: boolean;
  @ApiProperty({ type: [String] }) reasons!: string[];
  @ApiProperty({ format: 'uuid' }) admissionId!: string;
  @ApiProperty() admissionReference!: string;
  @ApiProperty() admissionVersion!: number;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ format: 'uuid' }) approvalSnapshotId?: string;
  @ApiPropertyOptional({ type: Object }) applicant?: Record<string, unknown>;
  @ApiPropertyOptional({ type: Object }) academicTarget?: Record<
    string,
    unknown
  >;
  @ApiPropertyOptional({ type: Object }) branches?: Record<string, unknown>;
  @ApiPropertyOptional({ type: Object }) financial?: Record<string, unknown>;
}
