import { Injectable } from '@nestjs/common';
import type { CallerContext } from '../../shared/types/caller-context';
@Injectable()
export class RecordPermissionsHelper {
  compute<T extends string>(
    caller: CallerContext,
    keys: readonly T[],
  ): Record<T, boolean> {
    return Object.fromEntries(
      keys.map((key) => [
        key,
        (caller.permissionKeys ?? caller.role?.permissionKeys ?? []).includes(
          key,
        ),
      ]),
    ) as Record<T, boolean>;
  }
}
