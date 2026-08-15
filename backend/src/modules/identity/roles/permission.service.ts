import { Injectable } from '@nestjs/common';
import { PermissionRepository } from './permission.repository';
@Injectable()
export class PermissionService {
  constructor(private readonly permissions: PermissionRepository) {}
  async catalogue() {
    const groups = new Map<string, unknown[]>();
    for (const permission of await this.permissions.listActive()) {
      const values = groups.get(permission.moduleKey) ?? [];
      values.push(permission);
      groups.set(permission.moduleKey, values);
    }
    return [...groups].map(([moduleKey, permissions]) => ({
      moduleKey,
      permissions,
    }));
  }
}
