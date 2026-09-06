import type { DomainEvent } from '../../../core/events/domain-event.bus';

export const OrganizationEventName = {
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
