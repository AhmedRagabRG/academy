import {
  DomainException,
  NotFoundException,
} from '../../../src/core/exceptions';
import { TagService } from '../../../src/modules/tags/tag.service';
import type { TagRepository } from '../../../src/modules/tags/tag.repository';

const tag = (overrides: Record<string, unknown> = {}) => ({
  id: 'tag-1',
  organizationId: 'org-1',
  code: 'lead',
  label: 'عميل محتمل',
  color: 'blue',
  active: true,
  _count: { conversations: 0 },
  ...overrides,
});

const harness = (overrides: Record<string, unknown> = {}) => {
  const db = {
    inboxTag: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue(tag()),
      update: jest.fn().mockResolvedValue(tag()),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  };
  const repo = {
    db,
    organizationId: jest.fn().mockResolvedValue('org-1'),
    list: jest.fn().mockResolvedValue([tag()]),
    byId: jest.fn().mockResolvedValue(tag()),
    codeTaken: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as unknown as TagRepository;
  return { service: new TagService(repo), repo, db };
};

describe('TagService', () => {
  it('projects the usage count the UI needs to explain a refused delete', async () => {
    const { service } = harness({
      list: jest
        .fn()
        .mockResolvedValue([tag({ _count: { conversations: 4 } })]),
    });
    const [first] = await service.list();
    expect(first?.usageCount).toBe(4);
  });

  it('derives a readable code from a Latin label', async () => {
    const { service, db } = harness();
    await service.create({ label: 'Hot Lead', color: 'red' });
    const [args] = db.inboxTag.create.mock.calls[0] as [
      { data: { code: string } },
    ];
    expect(args.data.code).toBe('hot-lead');
  });

  it('falls back to an opaque code when the label slugifies to nothing', async () => {
    // An Arabic label leaves no latin characters, which would otherwise produce
    // an empty string and collide with every other Arabic-labelled tag.
    const { service, db } = harness();
    await service.create({ label: 'عميل محتمل', color: 'blue' });
    const [args] = db.inboxTag.create.mock.calls[0] as [
      { data: { code: string } },
    ];
    expect(args.data.code).toMatch(/^tag-[0-9a-f]{8}$/);
  });

  it('disambiguates a code that is already taken', async () => {
    const taken = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { service, db } = harness({ codeTaken: taken });
    await service.create({ label: 'Lead', color: 'blue' });
    const [args] = db.inboxTag.create.mock.calls[0] as [
      { data: { code: string } },
    ];
    expect(args.data.code).toBe('lead-2');
  });

  it('rejects a duplicate label', async () => {
    const { service, db } = harness();
    db.inboxTag.count.mockResolvedValueOnce(1);
    await expect(
      service.create({ label: 'عميل محتمل', color: 'blue' }),
    ).rejects.toMatchObject({ code: 'tag-label-duplicate' });
  });

  it('404s for a tag outside the organization', async () => {
    const { service } = harness({ byId: jest.fn().mockResolvedValue(null) });
    await expect(
      service.update('nope', { active: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an empty update', async () => {
    const { service } = harness();
    await expect(service.update('tag-1', {})).rejects.toBeInstanceOf(
      DomainException,
    );
  });

  it('refuses to delete a tag that conversations still carry', async () => {
    const { service, db } = harness({
      byId: jest.fn().mockResolvedValue(tag({ _count: { conversations: 3 } })),
    });
    await expect(service.remove('tag-1')).rejects.toMatchObject({
      code: 'tag-in-use',
    });
    expect(db.inboxTag.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused tag', async () => {
    const { service, db } = harness();
    await service.remove('tag-1');
    expect(db.inboxTag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
  });

  it('lets a rename keep its own label', async () => {
    const { service, db } = harness();
    await service.update('tag-1', { label: 'عميل محتمل' });
    // Same label as the row itself must not count as a clash.
    expect(db.inboxTag.update).toHaveBeenCalled();
  });
});
