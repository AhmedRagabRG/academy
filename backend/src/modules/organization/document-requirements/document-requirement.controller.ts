import { Body, Controller, Delete, Get, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { NotFoundException } from '../../../core/exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import { DocumentRequirementService } from './document-requirement.service';
import {
  DocumentRequirementQueryDto,
  UpdateDocumentRequirementsDto,
} from './dto/document-requirement.dto';

/**
 * The editable source of the document lists Admissions and Students ask for.
 * Both modules read whatever is configured here, so a change lands without a
 * deployment — which is the whole reason the lists stopped being constants.
 */
@ApiTags('Settings - Document Requirements')
@Controller('settings/document-requirements')
export class DocumentRequirementController {
  constructor(private readonly requirements: DocumentRequirementService) {}

  @Get()
  @RequirePermissions('settings.documentRequirements.view')
  @ApiOperation({ summary: 'قائمة المستندات المطلوبة' })
  @ApiResponse({
    status: 200,
    description:
      'The list governing the module. With an offeringId it returns that offering\'s override, or the organization default with inherited:true when it has none.',
  })
  @ApiResponse({ status: 404, description: 'not-found' })
  async get(@Query() query: DocumentRequirementQueryDto) {
    const policy = await this.requirements.resolve(
      query.module,
      query.offeringId,
    );
    if (!policy) throw new NotFoundException();
    return policy;
  }

  @Put()
  @RequirePermissions('settings.documentRequirements.update')
  @ApiOperation({ summary: 'تحديث المستندات المطلوبة' })
  @ApiResponse({ status: 200, description: 'The stored list and its new version' })
  @ApiResponse({ status: 409, description: 'version-conflict' })
  @ApiResponse({ status: 422, description: 'validation-failed' })
  update(
    @Body() dto: UpdateDocumentRequirementsDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.requirements.update(caller, dto);
  }

  @Delete()
  @RequirePermissions('settings.documentRequirements.update')
  @ApiOperation({ summary: 'إلغاء تخصيص المستندات لبرنامج' })
  @ApiResponse({
    status: 200,
    description:
      'Drops the offering override so it follows the organization default again.',
  })
  async clear(@Query() query: DocumentRequirementQueryDto) {
    if (!query.offeringId) throw new NotFoundException();
    await this.requirements.clearOverride(query.module, query.offeringId);
    return this.requirements.resolve(query.module, query.offeringId);
  }
}
