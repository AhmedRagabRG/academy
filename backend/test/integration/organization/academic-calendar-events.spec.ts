import { OrganizationEventName } from '../../../src/modules/organization/events/organization.events';
describe('calendar events', () => {
  it('uses one activation event vocabulary', () => {
    expect(OrganizationEventName.AcademicYearActivated).toBe(
      'organization.academic-year-activated',
    );
    expect(OrganizationEventName.AcademicTermStatusChanged).toContain(
      'academic-term',
    );
  });
});
