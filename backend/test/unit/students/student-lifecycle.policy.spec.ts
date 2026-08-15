import 'reflect-metadata';
import { StudentLifecyclePolicy } from '../../../src/modules/students/lifecycle/student-lifecycle.policy';
import type { StudentStatus } from '../../../src/modules/students/types/students.types';

const ALL_STATUSES: StudentStatus[] = [
  'active',
  'suspended',
  'graduated',
  'withdrawn',
  'archived',
];

/** The exact table from docs/api-data-requirements.html §4.6. */
const PERMITTED: Record<
  string,
  { permission: string; reasonRequired: boolean }
> = {
  'active>suspended': {
    permission: 'students.status.manage',
    reasonRequired: true,
  },
  'active>graduated': {
    permission: 'students.status.manage',
    reasonRequired: false,
  },
  'active>withdrawn': {
    permission: 'students.status.manage',
    reasonRequired: true,
  },
  'active>archived': { permission: 'students.archive', reasonRequired: true },
  'suspended>active': {
    permission: 'students.status.manage',
    reasonRequired: false,
  },
  'suspended>withdrawn': {
    permission: 'students.status.manage',
    reasonRequired: true,
  },
  'suspended>archived': {
    permission: 'students.archive',
    reasonRequired: true,
  },
  'graduated>archived': {
    permission: 'students.archive',
    reasonRequired: false,
  },
  'graduated>active': {
    permission: 'students.status.correct',
    reasonRequired: true,
  },
  'withdrawn>archived': {
    permission: 'students.archive',
    reasonRequired: false,
  },
  'withdrawn>active': {
    permission: 'students.status.correct',
    reasonRequired: true,
  },
  'archived>active': {
    permission: 'students.activate',
    reasonRequired: false,
  },
};

describe('StudentLifecyclePolicy', () => {
  const policy = new StudentLifecyclePolicy();

  it('permits exactly the twelve documented transitions and nothing else', () => {
    const found: string[] = [];
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const rule = policy.find(from, to);
        if (rule) found.push(`${from}>${to}`);
      }
    }
    expect(found.sort()).toEqual(Object.keys(PERMITTED).sort());
  });

  it.each(Object.entries(PERMITTED))(
    'requires the documented permission and reason for %s',
    (pair, expected) => {
      const [from, to] = pair.split('>') as [StudentStatus, StudentStatus];
      const rule = policy.find(from, to);
      expect(rule).not.toBeNull();
      expect(rule?.permission).toBe(expected.permission);
      expect(rule?.reasonRequired).toBe(expected.reasonRequired);
    },
  );

  it('refuses every pair absent from the table, including self-transitions', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (PERMITTED[`${from}>${to}`]) continue;
        expect(policy.find(from, to)).toBeNull();
      }
    }
  });

  it('never allows leaving archived except by reactivation', () => {
    expect(policy.allowedFrom('archived')).toEqual(['active']);
  });

  it('requires the dedicated correction authority out of terminal statuses', () => {
    expect(policy.find('graduated', 'active')?.permission).toBe(
      'students.status.correct',
    );
    expect(policy.find('withdrawn', 'active')?.permission).toBe(
      'students.status.correct',
    );
  });

  it('narrows available actions to what the caller may actually do', () => {
    expect(
      policy.availableActions('active', ['students.status.manage']),
    ).toEqual(['suspended', 'graduated', 'withdrawn']);
    // Archiving needs its own key, so it drops out without it.
    expect(
      policy.availableActions('active', ['students.status.manage']),
    ).not.toContain('archived');
    expect(policy.availableActions('active', [])).toEqual([]);
  });

  it('treats archived as the only read-only status', () => {
    expect(policy.isReadOnlyStatus('archived')).toBe(true);
    for (const status of ALL_STATUSES.filter((s) => s !== 'archived'))
      expect(policy.isReadOnlyStatus(status)).toBe(false);
  });
});
