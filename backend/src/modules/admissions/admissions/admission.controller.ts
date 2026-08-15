import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import {
  ApiAdmissionCreate,
  ApiAdmissionCsv,
  ApiAdmissionList,
  ApiAdmissionMutation,
  ApiAdmissionRead,
} from '../../../shared/swagger/admissions-api.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { AdmissionsLookupsService } from '../lookups/admissions-lookups.service';
import { AdmissionReadinessService } from '../readiness/admission-readiness.service';
import { AdmissionsEnrollmentService } from '../readiness/admissions-enrollment.service';
import { AdmissionExportService } from './admission-export.service';
import { AdmissionLifecycleService } from './admission-lifecycle.service';
import { AdmissionService } from './admission.service';
import {
  BulkAdmissionStatusDto,
  ChangeAdmissionStatusDto,
  AdmissionReadinessQueryDto,
} from './dto/admission-lifecycle.dto';
import {
  AdmissionEnrollmentReadinessResponseDto,
  AdmissionListItemResponseDto,
  AdmissionReadinessResponseDto,
  AdmissionResponseDto,
  BulkAdmissionStatusResponseDto,
} from './dto/admission-response.dto';
import {
  ChangeAdmissionSelectionDto,
  UpdateAdmissionFinancialsDto,
} from './dto/admission-revision.dto';
import {
  CreateAdmissionDto,
  FindAdmissionDuplicatesDto,
} from './dto/create-admission.dto';
import { ListAdmissionsDto } from './dto/list-admissions.dto';
import { UpdateAdmissionDto } from './dto/update-admission.dto';

@ApiTags('Admissions')
@Controller('admissions')
export class AdmissionController {
  constructor(
    private readonly admissions: AdmissionService,
    private readonly lifecycleService: AdmissionLifecycleService,
    private readonly readinessService: AdmissionReadinessService,
    private readonly enrollment: AdmissionsEnrollmentService,
    private readonly exporter: AdmissionExportService,
    private readonly organization: OrganizationProfileService,
    private readonly lookupsService: AdmissionsLookupsService,
  ) {}

  @Get()
  @RequirePermissions('admissions.view')
  @ApiAdmissionList('قائمة طلبات القبول', AdmissionListItemResponseDto)
  list(
    @CurrentCaller() caller: CallerContext,
    @Query() query: ListAdmissionsDto,
  ) {
    return this.admissions.list(caller, query);
  }

  @Get('export')
  @RequirePermissions('admissions.export')
  @ApiAdmissionCsv('تصدير طلبات القبول')
  async export(
    @CurrentCaller() caller: CallerContext,
    @Query() query: ListAdmissionsDto,
    @Res() response: Response,
  ) {
    response.type('text/csv; charset=utf-8');
    for await (const chunk of this.exporter.streamCsv(caller, query)) {
      response.write(chunk);
    }
    response.end();
  }

  @Get('lookups')
  @RequirePermissions('admissions.view')
  @ApiResponse({ status: 200, description: 'Admissions lookup bundle' })
  @ApiOperation({ summary: 'خيارات ونماذج القبول' })
  lookups() {
    return this.lookupsService.get();
  }

  @Post('duplicates')
  @RequirePermissions('admissions.create')
  @ApiOperation({ summary: 'فحص تكرار بيانات المتقدم' })
  @ApiResponse({ status: 200, description: 'Duplicate candidates' })
  duplicates(@Body() dto: FindAdmissionDuplicatesDto) {
    return this.admissions.duplicates(dto);
  }

  @Post('bulk-status')
  @RequirePermissions('admissions.view')
  @ApiAdmissionMutation(
    'تغيير حالات طلبات قبول متعددة',
    BulkAdmissionStatusResponseDto,
  )
  async bulkStatus(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: BulkAdmissionStatusDto,
  ) {
    const organization = await this.organization.get();
    return this.lifecycleService.transitionBulk(
      dto.items.map((item) => ({
        admissionId: item.admissionId,
        toStatus: item.toStatus,
        expectedVersion: item.expectedVersion,
        reason: item.reason,
      })),
      organization.organizationId,
      caller,
    );
  }

  @Post()
  @RequirePermissions('admissions.create')
  @ApiAdmissionCreate('إنشاء طلب قبول', AdmissionResponseDto)
  create(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateAdmissionDto,
  ) {
    return this.admissions.create(caller, dto);
  }

  @Get(':id')
  @RequirePermissions('admissions.view')
  @ApiAdmissionRead('تفاصيل طلب القبول', AdmissionResponseDto)
  get(@CurrentCaller() caller: CallerContext, @Param('id') id: string) {
    return this.admissions.get(caller, id);
  }

  @Patch(':id')
  @RequirePermissions('admissions.update')
  @ApiAdmissionMutation('تحديث مسودة القبول', AdmissionResponseDto)
  update(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateAdmissionDto,
  ) {
    return this.admissions.update(caller, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('admissions.view')
  @ApiAdmissionMutation('تغيير حالة القبول', AdmissionResponseDto)
  async status(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: ChangeAdmissionStatusDto,
  ) {
    const organization = await this.organization.get();
    await this.lifecycleService.transition({
      admissionId: id,
      organizationId: organization.organizationId,
      toStatus: dto.toStatus,
      expectedVersion: dto.expectedVersion,
      reason: dto.reason,
      caller,
    });
    return this.admissions.get(caller, id);
  }

  @Patch(':id/selection')
  @RequirePermissions('admissions.academic.manage')
  @ApiAdmissionMutation('تغيير الاختيار الأكاديمي', AdmissionResponseDto)
  selection(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: ChangeAdmissionSelectionDto,
  ) {
    return this.admissions.changeSelection(caller, id, dto);
  }

  @Patch(':id/financials')
  @RequirePermissions('admissions.finance.manage')
  @ApiAdmissionMutation('تحديث الإعداد المالي', AdmissionResponseDto)
  financials(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateAdmissionFinancialsDto,
  ) {
    return this.admissions.updateFinancials(caller, id, dto);
  }

  @Get(':id/readiness')
  @RequirePermissions('admissions.view')
  @ApiAdmissionRead('جاهزية طلب القبول', AdmissionReadinessResponseDto)
  async readiness(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Query() query: AdmissionReadinessQueryDto,
  ) {
    await this.admissions.get(caller, id);
    const organization = await this.organization.get();
    return this.readinessService.evaluate(
      id,
      organization.organizationId,
      query.action,
    );
  }

  @Get(':id/lifecycle')
  @RequirePermissions('admissions.view')
  @ApiOperation({ summary: 'سجل دورة حياة القبول' })
  @ApiResponse({ status: 200, description: 'Immutable lifecycle history' })
  async lifecycle(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
  ) {
    await this.admissions.get(caller, id);
    const organization = await this.organization.get();
    return this.lifecycleService.lifecycle(id, organization.organizationId);
  }

  @Get(':id/financial-history')
  @RequirePermissions('admissions.finance.view')
  @ApiOperation({ summary: 'السجل المالي للقبول' })
  @ApiResponse({ status: 200, description: 'Immutable financial revisions' })
  financialHistory(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
  ) {
    return this.admissions.financialHistory(caller, id);
  }

  @Get(':id/enrollment-readiness')
  @RequirePermissions('admissions.enrollment-readiness')
  @ApiAdmissionRead(
    'جاهزية التحويل إلى طالب',
    AdmissionEnrollmentReadinessResponseDto,
  )
  async enrollmentReadiness(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
  ) {
    await this.admissions.get(caller, id);
    return this.enrollment.getEnrollmentReadiness(id);
  }
}
