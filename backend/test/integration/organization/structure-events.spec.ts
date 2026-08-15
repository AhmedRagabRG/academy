import { OrganizationEventName } from '../../../src/modules/organization/events/organization.events';
describe('structure events', () => {
  it('defines distinct create/update/status events', () => {
    expect(
      new Set([
        OrganizationEventName.BranchCreated,
        OrganizationEventName.BranchUpdated,
        OrganizationEventName.BranchStatusChanged,
        OrganizationEventName.DepartmentCreated,
        OrganizationEventName.DepartmentUpdated,
        OrganizationEventName.DepartmentStatusChanged,
      ]).size,
    ).toBe(6);
  });
});
