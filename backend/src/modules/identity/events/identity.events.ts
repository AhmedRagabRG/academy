import type { DomainEvent } from '../../../core/events/domain-event.bus';

export const IdentityEventName = {
  Login: 'identity.login',
  LoginFailed: 'identity.login-failed',
  Logout: 'identity.logout',
  PasswordChanged: 'identity.password-changed',
  PasswordReset: 'identity.password-reset',
  EmployeeCreated: 'identity.employee-created',
  EmployeeUpdated: 'identity.employee-updated',
  EmployeeStatusChanged: 'identity.employee-status-changed',
  RoleCreated: 'identity.role-created',
  RoleUpdated: 'identity.role-updated',
  RolePermissionsChanged: 'identity.role-permissions-changed',
  SessionRevoked: 'identity.session-revoked',
} as const;

export interface IdentityEventPayloads {
  [IdentityEventName.Login]: { sessionId: string };
  [IdentityEventName.LoginFailed]: {
    email: string;
    reason: 'invalid_credentials' | 'inactive_account';
  };
  [IdentityEventName.Logout]: { sessionId: string };
  [IdentityEventName.PasswordChanged]: { preservedSessionId: string };
  [IdentityEventName.PasswordReset]: { sessionsRevoked: number };
  [IdentityEventName.EmployeeCreated]: {
    roleIds: string[];
  };
  [IdentityEventName.EmployeeUpdated]: { changedFields: string[] };
  [IdentityEventName.EmployeeStatusChanged]: {
    previousStatus: string;
    status: string;
    sessionsRevoked: number;
  };
  [IdentityEventName.RoleCreated]: { permissionIds: string[] };
  [IdentityEventName.RoleUpdated]: { changedFields: string[] };
  [IdentityEventName.RolePermissionsChanged]: { permissionIds: string[] };
  [IdentityEventName.SessionRevoked]: { sessionId: string; reason: string };
}

export type IdentityEventNameValue = keyof IdentityEventPayloads;

export type IdentityDomainEvent<
  Name extends IdentityEventNameValue = IdentityEventNameValue,
> = Omit<DomainEvent, 'name' | 'payload'> & {
  name: Name;
  payload: IdentityEventPayloads[Name];
};
