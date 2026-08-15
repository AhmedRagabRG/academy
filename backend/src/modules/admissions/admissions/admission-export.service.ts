import { Injectable } from '@nestjs/common';
import type { CallerContext } from '../../../shared/types/caller-context';
import { AdmissionService } from './admission.service';
import type { ListAdmissionsDto } from './dto/list-admissions.dto';

@Injectable()
export class AdmissionExportService {
  constructor(private readonly admissions: AdmissionService) {}

  async *streamCsv(
    caller: CallerContext,
    query: ListAdmissionsDto,
  ): AsyncGenerator<string> {
    const header = [
      'reference',
      'applicantName',
      'phoneHint',
      'offeringLabel',
      'batchLabel',
      'registrationBranchLabel',
      'studyBranchLabel',
      'status',
      'updatedAt',
    ];
    yield `\uFEFF${header.join(',')}\r\n`;
    let page = 1;
    while (true) {
      const result = await this.admissions.list(caller, {
        ...query,
        page,
        pageSize: 100,
      });
      for (const row of result.items as Array<Record<string, unknown>>) {
        yield `${header.map((key) => this.escape(row[key])).join(',')}\r\n`;
      }
      if (page >= result.totalPages) break;
      page += 1;
    }
  }

  async csv(caller: CallerContext, query: ListAdmissionsDto): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamCsv(caller, query)) chunks.push(chunk);
    return chunks.join('');
  }

  private escape(value: unknown): string {
    const scalar =
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
        ? String(value)
        : '';
    return `"${scalar.replaceAll('"', '""')}"`;
  }
}
