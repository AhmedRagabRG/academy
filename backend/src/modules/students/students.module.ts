import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { StorageModule } from '../../storage/storage.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationModule } from '../organization/organization.module';
import { ProgramBatchesModule } from '../program-batches/program-batches.module';
import { StudentDocumentController } from './documents/student-document.controller';
import { StudentDocumentPolicy } from './documents/student-document.policy';
import { StudentDocumentRepository } from './documents/student-document.repository';
import { StudentDocumentService } from './documents/student-document.service';
import { StudentIntakeController } from './intake/student-intake.controller';
import { StudentIntakeRepository } from './intake/student-intake.repository';
import { StudentIntakeService } from './intake/student-intake.service';
import { StudentLifecyclePolicy } from './lifecycle/student-lifecycle.policy';
import { StudentStatusController } from './lifecycle/student-status.controller';
import { StudentStatusService } from './lifecycle/student-status.service';
import { StudentsLookupsController } from './lookups/students-lookups.controller';
import { StudentsLookupsService } from './lookups/students-lookups.service';
import { StudentMapper } from './mappers/student.mapper';
import { StudentNoteController } from './notes/student-note.controller';
import { StudentNoteRepository } from './notes/student-note.repository';
import { StudentNoteService } from './notes/student-note.service';
import { StudentContextService } from './summaries/student-context.service';
import { AbsentStudentFinanceReader } from './summaries/student-finance-reader.adapter';
import { StudentSummaryController } from './summaries/student-summary.controller';
import { StudentCodeService } from './students/student-code.service';
import { StudentExportService } from './students/student-export.service';
import { StudentIdentityPolicy } from './students/student-identity.policy';
import { StudentController } from './students/student.controller';
import { StudentPolicy } from './students/student.policy';
import { StudentRepository } from './students/student.repository';
import { StudentService } from './students/student.service';
import { StudentTimelineController } from './timeline/student-timeline.controller';
import { StudentTimelineReadService } from './timeline/student-timeline-read.service';
import { StudentTimelineRepository } from './timeline/student-timeline.repository';
import { StudentTimelineService } from './timeline/student-timeline.service';
import { STUDENT_FINANCE_READER_PORT } from './types/student-finance-reader.port';
import { STUDENTS_CONTEXT_PORT } from './types/students-context.port';

@Module({
  imports: [
    CoreModule,
    StorageModule,
    IdentityModule,
    OrganizationModule,
    CatalogModule,
    ProgramBatchesModule,
    AdmissionsModule,
  ],
  controllers: [
    // Order matters: the literal `students/lookups`, `students/intake` and
    // `students/bulk-status` routes must be registered before the
    // `students/:studentId` wildcard can swallow them.
    StudentsLookupsController,
    StudentIntakeController,
    StudentStatusController,
    StudentDocumentController,
    StudentNoteController,
    StudentTimelineController,
    StudentSummaryController,
    StudentController,
  ],
  providers: [
    StudentRepository,
    StudentService,
    StudentExportService,
    StudentIntakeRepository,
    StudentIntakeService,
    StudentDocumentRepository,
    StudentDocumentService,
    StudentNoteRepository,
    StudentNoteService,
    StudentStatusService,
    StudentTimelineRepository,
    StudentTimelineService,
    StudentTimelineReadService,
    StudentContextService,
    StudentMapper,
    StudentPolicy,
    StudentIdentityPolicy,
    StudentLifecyclePolicy,
    StudentDocumentPolicy,
    StudentCodeService,
    StudentsLookupsService,
    AbsentStudentFinanceReader,
    {
      // Student Finance (module 009) replaces this binding with the real
      // reader; no service changes when it lands (Principle XVI).
      provide: STUDENT_FINANCE_READER_PORT,
      useExisting: AbsentStudentFinanceReader,
    },
    {
      provide: STUDENTS_CONTEXT_PORT,
      useExisting: StudentContextService,
    },
  ],
  exports: [STUDENTS_CONTEXT_PORT],
})
export class StudentsModule {}
