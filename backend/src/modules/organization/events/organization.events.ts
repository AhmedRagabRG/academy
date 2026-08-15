import type { DomainEvent } from '../../../core/events/domain-event.bus';

export const OrganizationEventName = {
  BranchCreated: 'organization.branch-created',
  BranchUpdated: 'organization.branch-updated',
  BranchStatusChanged: 'organization.branch-status-changed',
  DepartmentCreated: 'organization.department-created',
  DepartmentUpdated: 'organization.department-updated',
  DepartmentStatusChanged: 'organization.department-status-changed',
  AcademicYearCreated: 'organization.academic-year-created',
  AcademicYearUpdated: 'organization.academic-year-updated',
  AcademicYearActivated: 'organization.academic-year-activated',
  AcademicTermCreated: 'organization.academic-term-created',
  AcademicTermUpdated: 'organization.academic-term-updated',
  AcademicTermMoved: 'organization.academic-term-moved',
  AcademicTermStatusChanged: 'organization.academic-term-status-changed',
  LookupGroupChanged: 'organization.lookup-group-changed',
  LookupValueChanged: 'organization.lookup-value-changed',
  LookupValuesReordered: 'organization.lookup-values-reordered',
  ProfileUpdated: 'organization.profile-updated',
  SettingsUpdated: 'organization.settings-updated',
} as const;

export type OrganizationEventNameValue =
  (typeof OrganizationEventName)[keyof typeof OrganizationEventName];

export type OrganizationDomainEvent = DomainEvent & {
  name: OrganizationEventNameValue;
};
