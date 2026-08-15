import { OrganizationEventName } from '../../../src/modules/organization/events/organization.events';
describe('lookup events', () => {
  it('has one aggregate reorder event', () => {
    expect(OrganizationEventName.LookupValuesReordered).toBe(
      'organization.lookup-values-reordered',
    );
  });
});
