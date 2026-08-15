import type {
  ActorRef,
  StudentDocumentId,
  StudentDocumentVersionId,
  StudentEnrollmentId,
  StudentId,
  StudentNoteId,
  StudentStatus,
  StudentStatusChangeId,
  StudentTimelineEventId,
} from "../types/common"
import type {
  Student,
  StudentDocument,
  StudentEnrollment,
  StudentNote,
  StudentTimelineEvent,
} from "../types/domain"
import {
  batchCatalog,
  offeringCatalog,
  studentBranches,
  studentDepartments,
  studentDocumentTypes,
  studentQualifications,
  customerServiceEmployees,
  studentAcademicGrades,
} from "./students-lookups"

export interface StudentStore {
  students: Student[]
  enrollments: StudentEnrollment[]
  documents: StudentDocument[]
  notes: StudentNote[]
  timeline: StudentTimelineEvent[]
  /** Maps an admission approval snapshot to the student it produced. */
  intakeIndex: Map<string, StudentId>
}

const ORGANIZATION = "organization-alsalam"

const actor = (id: string, name: string, active = true): ActorRef => ({
  id,
  name,
  active,
})

const demoActor = actor("employee-demo", "أحمد محمد")
const saraActor = actor("employee-sara", "سارة علي")
const formerActor = actor("employee-former", "خالد سمير", false)

const branchLabel = (id: string) =>
  studentBranches.find((branch) => branch.value === id)?.label ?? id
const departmentLabel = (id: string) =>
  studentDepartments.find((department) => department.value === id)?.label ?? id
const qualificationLabel = (id: string) =>
  studentQualifications.find((item) => item.value === id)?.label ?? id
const employeeName = (id: string) =>
  customerServiceEmployees.find((item) => item.value === id)?.label ?? id
const gradeLabel = (id: string) =>
  studentAcademicGrades.find((item) => item.value === id)?.label ?? id

interface StudentSeed {
  code: string
  fullName: string
  status: StudentStatus
  dateOfBirth: string
  graduationYear: number
  primaryPhone: string
  guardianPhone?: string
  nationalId?: string
  alternativeIdentityReason?: string
  registrationBranchId: string
  studyBranchId: string
  departmentId: string
  academicGradeId?: string
  customerServiceEmployeeId: string
  qualificationId: string
  admissionDate: string
  enrollmentDate: string
  /** Offering ids; a program entry pairs with the batch at the same index. */
  offerings: { offeringId: string; batchId?: string; status: StudentEnrollment["status"] }[]
  documents: Partial<Record<string, "present" | "archived">>
  notes?: { content: string; author: ActorRef; createdAt: string }[]
}

const seeds: StudentSeed[] = [
  {
    code: "STD-2026-00001",
    fullName: "يوسف عبد الرحمن",
    status: "active",
    dateOfBirth: "2003-04-12",
    graduationYear: 2021,
    primaryPhone: "01012345678",
    nationalId: "30304120101234",
    registrationBranchId: "branch-main",
    studyBranchId: "branch-main",
    departmentId: "department-it",
    academicGradeId: "grade-intermediate",
    customerServiceEmployeeId: "employee-demo",
    qualificationId: "qualification-highschool",
    admissionDate: "2026-01-05T09:00:00.000Z",
    enrollmentDate: "2026-01-12T09:00:00.000Z",
    offerings: [
      {
        offeringId: "offering-program-fullstack",
        batchId: "batch-fs-2026-a",
        status: "active",
      },
      { offeringId: "offering-course-english", status: "completed" },
    ],
    documents: {
      "personal-photo": "present",
      "national-id": "present",
      "birth-certificate": "present",
      "qualification-certificate": "present",
      "admission-declaration": "present",
    },
    notes: [
      {
        content: "الطالب متابع بانتظام مع فريق خدمة العملاء.",
        author: demoActor,
        createdAt: "2026-02-01T10:00:00.000Z",
      },
      {
        content: "تم التواصل بخصوص مستند المؤهل ووصل المطلوب.",
        author: formerActor,
        createdAt: "2026-01-20T08:30:00.000Z",
      },
    ],
  },
  {
    code: "STD-2026-00002",
    fullName: "منة الله شريف",
    status: "active",
    dateOfBirth: "2010-09-03",
    graduationYear: 2026,
    primaryPhone: "01123456789",
    guardianPhone: "01098765432",
    nationalId: "31009030201234",
    registrationBranchId: "branch-cairo",
    studyBranchId: "branch-cairo",
    departmentId: "department-languages",
    customerServiceEmployeeId: "employee-sara",
    qualificationId: "qualification-highschool",
    admissionDate: "2026-02-10T09:00:00.000Z",
    enrollmentDate: "2026-02-14T09:00:00.000Z",
    offerings: [{ offeringId: "offering-course-english", status: "active" }],
    documents: {
      "personal-photo": "present",
      "national-id": "present",
      "parent-national-id": "present",
    },
  },
  {
    code: "STD-2026-00003",
    fullName: "كريم مصطفى",
    status: "suspended",
    dateOfBirth: "2000-11-27",
    graduationYear: 2018,
    primaryPhone: "01234567890",
    alternativeIdentityReason: "الرقم القومي قيد الاستخراج، تم اعتماد شهادة الميلاد",
    registrationBranchId: "branch-giza",
    studyBranchId: "branch-giza",
    departmentId: "department-business",
    academicGradeId: "grade-foundation",
    customerServiceEmployeeId: "employee-omar",
    qualificationId: "qualification-bachelor",
    admissionDate: "2026-01-18T09:00:00.000Z",
    enrollmentDate: "2026-01-25T09:00:00.000Z",
    offerings: [
      { offeringId: "offering-diploma-hr", status: "suspended" },
    ],
    documents: {
      "personal-photo": "present",
      "birth-certificate": "present",
      "admission-declaration": "archived",
    },
    notes: [
      {
        content: "تم إيقاف الطالب مؤقتًا بناءً على طلبه لظروف عمل.",
        author: saraActor,
        createdAt: "2026-03-02T12:00:00.000Z",
      },
    ],
  },
  {
    code: "STD-2026-00004",
    fullName: "هالة عادل",
    status: "graduated",
    dateOfBirth: "1998-06-15",
    graduationYear: 2016,
    primaryPhone: "01087654321",
    nationalId: "29806150301234",
    registrationBranchId: "branch-main",
    studyBranchId: "branch-alex",
    departmentId: "department-design",
    academicGradeId: "grade-advanced",
    customerServiceEmployeeId: "employee-mona",
    qualificationId: "qualification-master",
    admissionDate: "2025-09-01T09:00:00.000Z",
    enrollmentDate: "2025-09-08T09:00:00.000Z",
    offerings: [
      {
        offeringId: "offering-program-data",
        batchId: "batch-da-2026-a",
        status: "completed",
      },
      { offeringId: "offering-diploma-marketing", status: "completed" },
      { offeringId: "offering-archived-legacy", status: "completed" },
    ],
    documents: {
      "personal-photo": "present",
      "national-id": "present",
      "birth-certificate": "present",
      "qualification-certificate": "present",
      "admission-declaration": "present",
      "additional-attachment": "present",
    },
  },
  {
    code: "STD-2026-00005",
    fullName: "طارق سليم",
    status: "withdrawn",
    dateOfBirth: "2002-02-02",
    graduationYear: 2020,
    primaryPhone: "01199887766",
    nationalId: "30202020401234",
    registrationBranchId: "branch-alex",
    studyBranchId: "branch-alex",
    departmentId: "department-business",
    customerServiceEmployeeId: "employee-omar",
    qualificationId: "qualification-diploma",
    admissionDate: "2026-03-01T09:00:00.000Z",
    enrollmentDate: "2026-03-05T09:00:00.000Z",
    offerings: [{ offeringId: "offering-diploma-hr", status: "withdrawn" }],
    documents: { "personal-photo": "present", "national-id": "present" },
  },
  {
    code: "STD-2026-00006",
    fullName: "سلمى ناصر",
    status: "archived",
    dateOfBirth: "1999-12-19",
    graduationYear: 2017,
    primaryPhone: "01055443322",
    nationalId: "29912190501234",
    registrationBranchId: "branch-cairo",
    studyBranchId: "branch-main",
    departmentId: "department-it",
    customerServiceEmployeeId: "employee-sara",
    qualificationId: "qualification-bachelor",
    admissionDate: "2025-05-11T09:00:00.000Z",
    enrollmentDate: "2025-05-19T09:00:00.000Z",
    offerings: [
      {
        offeringId: "offering-program-fullstack",
        batchId: "batch-fs-2026-b",
        status: "completed",
      },
    ],
    documents: { "personal-photo": "archived", "national-id": "present" },
  },
  {
    code: "STD-2026-00007",
    fullName: "زياد فؤاد",
    status: "active",
    dateOfBirth: "2004-08-30",
    graduationYear: 2022,
    primaryPhone: "01144556677",
    nationalId: "30408300601234",
    registrationBranchId: "branch-main",
    studyBranchId: "branch-cairo",
    departmentId: "department-design",
    customerServiceEmployeeId: "employee-demo",
    qualificationId: "qualification-highschool",
    admissionDate: "2026-04-02T09:00:00.000Z",
    enrollmentDate: "2026-04-06T09:00:00.000Z",
    // Deliberately empty: a student may exist before any enrollment is recorded.
    offerings: [],
    documents: {},
  },
]

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`

function buildDocuments(seed: StudentSeed, studentId: StudentId) {
  return studentDocumentTypes.map((type): StudentDocument => {
    const state = seed.documents[type.key]
    if (!state)
      return {
        id: nextId("document") as StudentDocumentId,
        studentId,
        type,
        state: "missing",
        versions: [],
      }
    const versionId = nextId("document-version") as StudentDocumentVersionId
    const version = {
      id: versionId,
      versionNumber: 1,
      fileName: `${type.key}.pdf`,
      mimeType: type.allowedMimeTypes[0] ?? "application/pdf",
      size: 240_000,
      uploadedAt: seed.enrollmentDate,
      uploadedBy: demoActor,
      uploadAttemptId: `seed-${seed.code}-${type.key}`,
    }
    return {
      id: nextId("document") as StudentDocumentId,
      studentId,
      type,
      state: state === "archived" ? "archived" : "present",
      currentVersionId: versionId,
      versions: [version],
      archivedAt: state === "archived" ? "2026-05-01T09:00:00.000Z" : undefined,
      archivedBy: state === "archived" ? demoActor : undefined,
      archiveReason:
        state === "archived" ? "تم استبدال المستند بنسخة رسمية أحدث" : undefined,
    }
  })
}

function buildEnrollments(seed: StudentSeed, studentId: StudentId) {
  return seed.offerings.map((entry, index): StudentEnrollment => {
    const offering = offeringCatalog.find(
      (item) => item.id === entry.offeringId
    )
    const batch = entry.batchId
      ? batchCatalog.find((item) => item.id === entry.batchId)
      : undefined
    return {
      id: nextId("enrollment") as StudentEnrollmentId,
      studentId,
      offeringKind: offering?.kind ?? "training-course",
      offeringId: entry.offeringId,
      offeringVersionAtEnrollment: offering?.version ?? 1,
      offeringLabel: offering?.label ?? entry.offeringId,
      offeringCode: offering?.code ?? "—",
      batchId: batch?.id,
      batchVersionAtEnrollment: batch?.version,
      batchLabel: batch?.label,
      batchCode: batch?.code,
      registrationBranchLabel: branchLabel(seed.registrationBranchId),
      studyBranchLabel: branchLabel(seed.studyBranchId),
      enrollmentDate: new Date(
        new Date(seed.enrollmentDate).getTime() + index * 86_400_000
      ).toISOString(),
      status: entry.status,
      sourceAdmissionId: `admission-${seed.code}`,
    }
  })
}

function buildTimeline(
  seed: StudentSeed,
  studentId: StudentId,
  enrollments: StudentEnrollment[],
  documents: StudentDocument[]
): StudentTimelineEvent[] {
  const events: StudentTimelineEvent[] = []
  let order = 0
  const push = (
    category: StudentTimelineEvent["category"],
    occurredAt: string,
    summary: string,
    origin: StudentTimelineEvent["origin"],
    subjectRef?: string
  ) => {
    events.push({
      id: nextId("timeline") as StudentTimelineEventId,
      studentId,
      category,
      occurredAt,
      sequence: (order += 1),
      actor: demoActor,
      origin,
      subjectRef,
      summary,
    })
  }
  const submittedAt = new Date(
    new Date(seed.admissionDate).getTime() - 3 * 86_400_000
  ).toISOString()
  push("admission-submitted", submittedAt, "تم تقديم طلب القبول", "admissions")
  push(
    "admission-approved",
    seed.admissionDate,
    "تم اعتماد طلب القبول",
    "admissions"
  )
  push(
    "student-created",
    seed.enrollmentDate,
    `تم إنشاء سجل الطالب بكود ${seed.code}`,
    "students"
  )
  for (const enrollment of enrollments)
    push(
      "enrollment-added",
      enrollment.enrollmentDate,
      `تمت إضافة تسجيل في ${enrollment.offeringLabel}`,
      "students",
      enrollment.id
    )
  for (const document of documents.filter((item) => item.state !== "missing"))
    push(
      document.state === "archived" ? "document-archived" : "document-uploaded",
      document.versions[0]?.uploadedAt ?? seed.enrollmentDate,
      `${document.state === "archived" ? "تمت أرشفة" : "تم رفع"} مستند ${document.type.label}`,
      "students",
      document.id
    )
  if (seed.status !== "active")
    push(
      "status-changed",
      "2026-06-01T09:00:00.000Z",
      "تم تغيير حالة الطالب",
      "students"
    )
  return events
}

/** Deterministic seed store. Rebuilt on demand so tests never share mutations. */
export function createStudentStore(): StudentStore {
  sequence = 0
  const store: StudentStore = {
    students: [],
    enrollments: [],
    documents: [],
    notes: [],
    timeline: [],
    intakeIndex: new Map(),
  }

  for (const seed of seeds) {
    const studentId = `student-${seed.code}` as StudentId
    const approvalSnapshotId = `approval-${seed.code}`
    const enrollments = buildEnrollments(seed, studentId)
    const documents = buildDocuments(seed, studentId)

    const student: Student = {
      id: studentId,
      organizationId: ORGANIZATION,
      studentCode: seed.code,
      status: seed.status,
      identity: {
        fullName: seed.fullName,
        primaryPhone: seed.primaryPhone,
        guardianPhone: seed.guardianPhone,
        nationalId: seed.nationalId,
        alternativeIdentityReason: seed.alternativeIdentityReason,
        address: "القاهرة، جمهورية مصر العربية",
        dateOfBirth: seed.dateOfBirth,
        qualificationId: seed.qualificationId,
        qualificationLabel: qualificationLabel(seed.qualificationId),
        graduationYear: seed.graduationYear,
      },
      assignment: {
        registrationBranchId: seed.registrationBranchId,
        registrationBranchLabel: branchLabel(seed.registrationBranchId),
        studyBranchId: seed.studyBranchId,
        studyBranchLabel: branchLabel(seed.studyBranchId),
        departmentId: seed.departmentId,
        departmentLabel: departmentLabel(seed.departmentId),
        academicGradeId: seed.academicGradeId,
        academicGradeLabel: seed.academicGradeId
          ? gradeLabel(seed.academicGradeId)
          : undefined,
        customerServiceEmployeeId: seed.customerServiceEmployeeId,
        customerServiceEmployeeName: employeeName(seed.customerServiceEmployeeId),
      },
      system: {
        admissionId: `admission-${seed.code}`,
        admissionReference: `ADM-${seed.code.slice(-5)}`,
        approvalSnapshotId,
        admissionDate: seed.admissionDate,
        enrollmentDate: seed.enrollmentDate,
      },
      statusHistory: [
        {
          id: nextId("status-change") as StudentStatusChangeId,
          fromStatus: null,
          toStatus: "active",
          actor: demoActor,
          occurredAt: seed.enrollmentDate,
          sourceVersion: 0,
          resultVersion: 1,
        },
        ...(seed.status === "active"
          ? []
          : [
              {
                id: nextId("status-change") as StudentStatusChangeId,
                fromStatus: "active" as StudentStatus,
                toStatus: seed.status,
                reason: "بيانات تجريبية",
                actor: demoActor,
                occurredAt: "2026-06-01T09:00:00.000Z",
                sourceVersion: 1,
                resultVersion: 2,
              },
            ]),
      ],
      archivedAt: seed.status === "archived" ? "2026-06-01T09:00:00.000Z" : undefined,
      archiveReason: seed.status === "archived" ? "بيانات تجريبية" : undefined,
      createdAt: seed.enrollmentDate,
      createdBy: demoActor,
      updatedAt: seed.status === "active" ? seed.enrollmentDate : "2026-06-01T09:00:00.000Z",
      updatedBy: demoActor,
      version: seed.status === "active" ? 1 : 2,
    }

    store.students.push(student)
    store.enrollments.push(...enrollments)
    store.documents.push(...documents)
    store.timeline.push(
      ...buildTimeline(seed, studentId, enrollments, documents)
    )
    store.intakeIndex.set(approvalSnapshotId, studentId)
    for (const note of seed.notes ?? [])
      store.notes.push({
        id: nextId("note") as StudentNoteId,
        studentId,
        content: note.content,
        author: note.author,
        createdAt: note.createdAt,
      })
  }

  return store
}
