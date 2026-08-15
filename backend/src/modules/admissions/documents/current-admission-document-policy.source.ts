import { Injectable } from '@nestjs/common';
import { AdmissionDocumentPolicySource } from './admission-document-policy.service';
import { PrismaAdmissionDocumentRepository } from './admission-document.repository';

@Injectable()
export class CurrentAdmissionDocumentPolicySource extends AdmissionDocumentPolicySource {
  constructor(private readonly documents: PrismaAdmissionDocumentRepository) {
    super();
  }

  currentForAdmission(admissionId: string) {
    return this.documents.currentPolicyDefinition(admissionId);
  }
}
