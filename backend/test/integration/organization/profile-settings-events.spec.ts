import { OrganizationEventName } from '../../../src/modules/organization/events/organization.events';
describe('profile/settings events', () => {
  it('has aggregate post-write event names', () => {
    expect([
      OrganizationEventName.ProfileUpdated,
      OrganizationEventName.SettingsUpdated,
    ]).toEqual([
      'organization.profile-updated',
      'organization.settings-updated',
    ]);
  });
});
