import type { Admission, AdmissionDocument, Applicant } from "../types/domain"
import type {
  AdmissionDocumentId,
  AdmissionId,
  ApplicantId,
} from "../types/common"
import { admissionDocumentPolicy } from "./admissions-lookups"

const now = "2026-07-31T12:00:00.000Z"

export const seededApplicants: Applicant[] = [
  {
    id: "applicant-mariam" as ApplicantId,
    organizationId: "organization-alsalam",
    fullName: "مريم أحمد علي",
    primaryPhone: "01012345678",
    guardianPhone: "01098765432",
    nationalId: "29801011234567",
    address: "القاهرة، مدينة نصر",
    dateOfBirth: "1998-01-01",
    qualificationId: "qualification-bachelor",
    qualificationLabel: "بكالوريوس",
    graduationYear: 2020,
    notes: "متقدمة مهتمة بالمسار المهني",
    status: "active",
    createdAt: now,
    createdBy: "employee-demo",
    updatedAt: now,
    updatedBy: "employee-demo",
    version: 1,
  },
]

export const makeEmptyDocuments = (): AdmissionDocument[] =>
  admissionDocumentPolicy.requirements.map((requirement) => ({
    id: `document-${requirement.id}` as AdmissionDocumentId,
    requirement: structuredClone(requirement),
    state: "missing",
    versions: [],
    decisions: [],
  }))

export const seededAdmissions: Admission[] = [
  {
    id: "admission-mariam-1" as AdmissionId,
    reference: "ADM-2026-0001",
    organizationId: "organization-alsalam",
    applicantId: seededApplicants[0]!.id,
    status: "draft",
    assignment: {
      registrationBranchId: "branch-main",
      registrationBranchLabel: "الفرع الرئيسي",
      studyBranchId: "branch-main",
      studyBranchLabel: "الفرع الرئيسي",
      admissionsEmployeeId: "employee-admissions",
      admissionsEmployeeName: "سارة محمود",
      customerServiceEmployeeId: "employee-service",
      customerServiceEmployeeName: "منى إبراهيم",
      customerServiceManagerId: "manager-service",
      customerServiceManagerName: "محمد سمير",
      departmentId: "department-admissions",
      departmentLabel: "القبول",
      leadSourceId: "source-website",
      leadSourceLabel: "الموقع الإلكتروني",
      academicGradeId: "grade-very-good",
      academicGradeLabel: "جيد جدًا",
    },
    requirementSnapshot: structuredClone(admissionDocumentPolicy),
    documents: makeEmptyDocuments(),
    notes: "",
    lifecycle: [
      {
        id: "event-admission-created",
        fromStatus: null,
        toStatus: "draft",
        actor: { id: "employee-demo", name: "أحمد محمد" },
        occurredAt: now,
        sourceVersion: 0,
        resultVersion: 1,
      },
    ],
    financialHistory: [],
    selectionHistory: [],
    createdAt: now,
    createdBy: "employee-demo",
    updatedAt: now,
    updatedBy: "employee-demo",
    version: 1,
  },
]
