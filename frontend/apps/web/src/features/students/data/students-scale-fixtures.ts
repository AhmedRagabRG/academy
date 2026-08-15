import type {
  StudentEnrollmentId,
  StudentId,
  StudentStatus,
  StudentStatusChangeId,
} from "../types/common"
import type { Student, StudentEnrollment } from "../types/domain"
import {
  batchCatalog,
  customerServiceEmployees,
  offeringCatalog,
  studentAcademicGrades,
  studentBranches,
  studentDepartments,
  studentQualifications,
} from "./students-lookups"

/**
 * Deterministic large-set generation for the SC-004 performance target
 * (2s p95 across 20,000 students). Same seed always yields the same records.
 */

const ORGANIZATION = "organization-alsalam"

const firstNames = [
  "أحمد", "محمد", "مريم", "فاطمة", "عمر", "ليلى", "خالد", "نور",
  "حسن", "سلمى", "يوسف", "دينا", "طارق", "هالة", "كريم", "منى",
]
const lastNames = [
  "عبد الرحمن", "السيد", "حسين", "مصطفى", "فؤاد", "شريف", "عادل",
  "سليم", "ناصر", "إبراهيم", "زكي", "رشدي",
]

const statuses: StudentStatus[] = [
  "active",
  "active",
  "active",
  "suspended",
  "graduated",
  "withdrawn",
  "archived",
]

const activeBranches = studentBranches.filter((branch) => branch.active)

/** Cheap deterministic hash so every generated field is reproducible. */
function hash(seed: number, salt: number): number {
  return Math.abs(Math.imul(seed + salt, 2654435761)) % 1_000_003
}

const pick = <T>(items: readonly T[], seed: number, salt: number): T =>
  items[hash(seed, salt) % items.length] as T

export function buildScaleStudent(index: number): Student {
  const code = `STD-2026-${String(index + 100).padStart(5, "0")}`
  const studentId = `student-${code}` as StudentId
  const status = pick(statuses, index, 7)
  const registrationBranch = pick(activeBranches, index, 11)
  const studyBranch = pick(activeBranches, index, 13)
  const department = pick(studentDepartments, index, 17)
  const grade = pick(studentAcademicGrades, index, 19)
  const qualification = pick(studentQualifications, index, 23)
  const employee = pick(customerServiceEmployees, index, 29)
  const birthYear = 1995 + (hash(index, 31) % 15)
  const enrollmentDay = 1 + (hash(index, 37) % 28)
  const enrollmentMonth = 1 + (hash(index, 41) % 12)
  const enrollmentDate = `2026-${String(enrollmentMonth).padStart(2, "0")}-${String(enrollmentDay).padStart(2, "0")}T09:00:00.000Z`

  return {
    id: studentId,
    organizationId: ORGANIZATION,
    studentCode: code,
    status,
    identity: {
      fullName: `${pick(firstNames, index, 3)} ${pick(lastNames, index, 5)}`,
      primaryPhone: `010${String(10_000_000 + (hash(index, 43) % 89_999_999)).slice(0, 8)}`,
      nationalId: String(29_000_000_000_000 + hash(index, 47) * 977),
      address: "جمهورية مصر العربية",
      dateOfBirth: `${birthYear}-06-15`,
      qualificationId: qualification.value,
      qualificationLabel: qualification.label,
      graduationYear: birthYear + 18,
    },
    assignment: {
      registrationBranchId: registrationBranch.value,
      registrationBranchLabel: registrationBranch.label,
      studyBranchId: studyBranch.value,
      studyBranchLabel: studyBranch.label,
      departmentId: department.value,
      departmentLabel: department.label,
      academicGradeId: grade.value,
      academicGradeLabel: grade.label,
      customerServiceEmployeeId: employee.value,
      customerServiceEmployeeName: employee.label,
    },
    system: {
      admissionId: `admission-${code}`,
      admissionReference: `ADM-${String(index + 100).padStart(5, "0")}`,
      approvalSnapshotId: `approval-${code}`,
      admissionDate: enrollmentDate,
      enrollmentDate,
    },
    statusHistory: [
      {
        id: `status-change-scale-${index}` as StudentStatusChangeId,
        fromStatus: null,
        toStatus: "active",
        actor: { id: employee.value, name: employee.label, active: true },
        occurredAt: enrollmentDate,
        sourceVersion: 0,
        resultVersion: 1,
      },
    ],
    createdAt: enrollmentDate,
    createdBy: { id: employee.value, name: employee.label, active: true },
    updatedAt: enrollmentDate,
    updatedBy: { id: employee.value, name: employee.label, active: true },
    version: 1,
  }
}

export function buildScaleEnrollment(
  student: Student,
  index: number
): StudentEnrollment {
  const offering = pick(offeringCatalog, index, 53)
  const batch =
    offering.kind === "professional-program"
      ? (batchCatalog.find((item) => item.programId === offering.id) ??
        batchCatalog[0])
      : undefined
  return {
    id: `enrollment-scale-${index}` as StudentEnrollmentId,
    studentId: student.id,
    offeringKind: offering.kind,
    offeringId: offering.id,
    offeringVersionAtEnrollment: offering.version,
    offeringLabel: offering.label,
    offeringCode: offering.code,
    batchId: batch?.id,
    batchVersionAtEnrollment: batch?.version,
    batchLabel: batch?.label,
    batchCode: batch?.code,
    registrationBranchLabel: student.assignment.registrationBranchLabel,
    studyBranchLabel: student.assignment.studyBranchLabel,
    enrollmentDate: student.system.enrollmentDate,
    status: student.status === "graduated" ? "completed" : "active",
    sourceAdmissionId: student.system.admissionId,
  }
}

export interface ScaleData {
  students: Student[]
  enrollments: StudentEnrollment[]
}

export function buildScaleStudents(count = 20_000): ScaleData {
  const students: Student[] = []
  const enrollments: StudentEnrollment[] = []
  for (let index = 0; index < count; index += 1) {
    const student = buildScaleStudent(index)
    students.push(student)
    // A deterministic slice of students carries no enrollment yet.
    if (index % 37 !== 0)
      enrollments.push(buildScaleEnrollment(student, index))
  }
  return { students, enrollments }
}
