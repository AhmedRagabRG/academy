import { CrmUpdateContactTool } from '../../../../src/modules/ai/tools/crm-update-contact.tool';
import { HandoffToHumanTool } from '../../../../src/modules/ai/tools/handoff-to-human.tool';
import { CreateTicketTool } from '../../../../src/modules/ai/tools/create-ticket.tool';
import { RecordCollectedFieldsTool } from '../../../../src/modules/ai/tools/record-collected-fields.tool';
import type { ContactService } from '../../../../src/modules/contacts/contact.service';
import type { TicketService } from '../../../../src/modules/tickets/ticket.service';
import type { AiCallerContextService } from '../../../../src/modules/ai/runtime/ai-caller-context.service';
import { ToolBudgetService } from '../../../../src/modules/ai/tools/tool-budget.service';
import { TicketRoutingService } from '../../../../src/modules/ai/tools/ticket-routing.service';
import type { AiRunContext } from '../../../../src/modules/ai/tools/tool.contract';
import type { PrismaService } from '../../../../src/database/prisma.service';

const context: AiRunContext = {
  organizationId: 'org-1',
  conversationId: 'conv-1',
  agentId: 'agent-1',
  serviceAccountId: 'svc-1',
  aiTurnId: 'turn-1',
  customerId: 'customer-1',
  contactId: 'contact-1',
  knowledgeBaseIds: ['kb-1'],
  retrievalTopK: 6,
  retrievalMinScore: 0.35,
  allowedCrmFields: ['name', 'email', 'secondaryPhone', 'company', 'jobTitle'],
  collectionFields: [
    { key: 'name', label: 'الاسم' },
    { key: 'email', label: 'البريد' },
  ],
  routingCategories: [{ category: 'complaint', label: 'شكوى' }],
  routingMinConfidence: 0.6,
};

const makeCrmUpdate = (options: {
  contact?: Record<string, unknown> | null;
  updates?: number;
  update?: jest.Mock;
  addNote?: jest.Mock;
}) => {
  const contacts = {
    update: options.update ?? jest.fn().mockResolvedValue({}),
    addNote: options.addNote ?? jest.fn().mockResolvedValue({}),
  } as unknown as ContactService;
  const caller = {
    forAccount: jest.fn().mockResolvedValue({ accountId: 'svc-1' }),
  } as unknown as AiCallerContextService;
  const db = {
    contact: {
      findFirst: jest.fn().mockResolvedValue(
        options.contact === undefined
          ? {
              id: 'contact-1',
              name: 'أحمد',
              phone: '+201000000000',
              email: '',
              secondaryPhone: '',
              company: '',
              jobTitle: '',
              channelHandle: '',
            }
          : options.contact,
      ),
    },
    aiToolExecution: {
      count: jest.fn().mockResolvedValue(options.updates ?? 0),
    },
  } as unknown as PrismaService;
  const tool = new CrmUpdateContactTool(
    contacts,
    caller,
    new ToolBudgetService(db),
    db,
  );
  return { tool, contacts, db };
};

/** Mock call arguments and tool payloads arrive as `any`; read them typed. */
const argAt = <T>(mock: jest.Mock, call: number, index: number): T =>
  (mock.mock.calls[call] as unknown[])[index] as T;
const payloadOf = <T>(content: string): T => JSON.parse(content) as T;

interface ContactPatch {
  email?: string;
  company?: string;
  name?: string;
  phone?: string;
  channelHandle?: string;
}
interface UpdateResult {
  updated: boolean;
  applied: string[];
  rejected: Record<string, string>;
}

describe('crm_update_contact', () => {
  it('rejects phone in parse — it identifies the contact and is never writable', () => {
    const { tool } = makeCrmUpdate({});
    const parsed = tool.parse('{"fields":{"phone":"+201100000000"}}');
    expect(parsed).toMatchObject({ ok: false });
    expect(parsed.ok === false && parsed.error).toContain('phone');
  });

  it('rejects unknown fields', () => {
    const { tool } = makeCrmUpdate({});
    expect(tool.parse('{"fields":{"ownerAccountId":"x"}}')).toMatchObject({
      ok: false,
    });
    expect(tool.parse('{"fields":{"source":"google"}}')).toMatchObject({
      ok: false,
    });
  });

  it('fills only empty fields and carries the rest through unchanged', async () => {
    const update = jest.fn().mockResolvedValue({});
    const { tool } = makeCrmUpdate({
      contact: {
        id: 'contact-1',
        name: 'أحمد',
        phone: '+201000000000',
        email: '',
        secondaryPhone: '+201200000000',
        company: 'شركة',
        jobTitle: '',
        channelHandle: '@ah',
      },
      update,
    });
    const result = await tool.execute(
      {
        fields: { email: 'a@b.c', company: 'شركة جديدة', name: 'الاسم الجديد' },
      },
      context,
    );
    const payload = argAt<ContactPatch>(update, 0, 2);
    // email was empty → filled. company populated → refused, original kept.
    // name populated → refused, original kept. phone/channelHandle pass through.
    expect(payload.email).toBe('a@b.c');
    expect(payload.company).toBe('شركة');
    expect(payload.name).toBe('أحمد');
    expect(payload.phone).toBe('+201000000000');
    expect(payload.channelHandle).toBe('@ah');
    const body = payloadOf<UpdateResult>(result.content);
    expect(body.updated).toBe(true);
    expect(body.applied).toEqual(['email']);
    // Each refusal carries a human-readable reason; the exact wording is not
    // the contract, the presence of one is.
    expect(Object.keys(body.rejected).sort()).toEqual(['company', 'name']);
    expect(typeof body.rejected.company).toBe('string');
    expect(typeof body.rejected.name).toBe('string');
  });

  it('respects the admin allow-list at run time', async () => {
    const { tool } = makeCrmUpdate({});
    const result = await tool.execute(
      { fields: { email: 'a@b.c' } },
      {
        ...context,
        allowedCrmFields: ['name'],
      },
    );
    expect(JSON.parse(result.content)).toMatchObject({ updated: false });
  });

  it('writes an audit note naming what the AI changed', async () => {
    const addNote = jest.fn().mockResolvedValue({});
    const { tool } = makeCrmUpdate({ addNote });
    await tool.execute({ fields: { email: 'a@b.c' } }, context);
    expect(addNote).toHaveBeenCalled();
    const note = argAt<string>(addNote, 0, 2);
    expect(note).toContain('المساعد الذكي');
    expect(note).toContain('email');
  });

  it('stops at the per-turn update budget', async () => {
    const { tool } = makeCrmUpdate({ updates: 3 });
    const result = await tool.execute({ fields: { email: 'a@b.c' } }, context);
    expect(JSON.parse(result.content)).toMatchObject({ updated: false });
  });
});

describe('handoff_to_human', () => {
  it('parses a reason and returns a handoff effect without touching anything itself', async () => {
    const tool = new HandoffToHumanTool();
    const parsed = tool.parse('{"reason":"العميل يريد موظفًا"}');
    expect(parsed).toMatchObject({ ok: true });
    const result = await tool.execute({ reason: 'x' }, context);
    expect(result.effect).toBe('handoff');
    expect(JSON.parse(result.content)).toMatchObject({ handedOff: true });
  });

  it('rejects an empty reason', () => {
    const tool = new HandoffToHumanTool();
    expect(tool.parse('{"reason":"  "}')).toMatchObject({ ok: false });
  });
});

describe('create_ticket (guards)', () => {
  // Held separately so assertions read the jest.Mock directly rather than
  // pulling an unbound method off the mocked service.
  const createSpy = jest.fn().mockResolvedValue({ id: 't1', number: 'TKT-1' });
  const tickets = { create: createSpy } as unknown as TicketService;
  const caller = {
    forAccount: jest.fn().mockResolvedValue({ accountId: 'svc-1' }),
  } as unknown as AiCallerContextService;
  const db = {
    aiToolExecution: { count: jest.fn().mockResolvedValue(0) },
    aiTicketRoutingRule: { findUnique: jest.fn().mockResolvedValue(null) },
    ticketTeam: { findFirst: jest.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;
  const tool = new CreateTicketTool(
    tickets,
    new TicketRoutingService(db),
    caller,
    new ToolBudgetService(db),
  );

  it('builds the schema enum from the agent routing categories', () => {
    const definition = tool.definition(context);
    const category = definition.function.parameters?.properties?.category as {
      enum?: string[];
    };
    expect(category.enum).toEqual(['complaint']);
  });

  it('rejects malformed arguments instead of throwing', () => {
    expect(tool.parse('not json')).toMatchObject({ ok: false });
    expect(
      tool.parse(
        '{"title":"x","description":"y","priority":"urgent","category":"complaint","confidence":2}',
      ),
    ).toMatchObject({ ok: false });
  });

  it('refuses a category outside the closed enum', async () => {
    const result = await tool.execute(
      {
        title: 'شكوى تأخير',
        description: 'وصف',
        priority: 'high',
        category: 'not-a-category',
        confidence: 0.9,
      } as never,
      context,
    );
    expect(payloadOf<{ created: boolean }>(result.content).created).toBe(false);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('enforces one ticket per conversation per day', async () => {
    const budgetDb = {
      aiToolExecution: { count: jest.fn().mockResolvedValue(1) },
    } as unknown as PrismaService;
    const budgeted = new CreateTicketTool(
      tickets,
      new TicketRoutingService(db),
      caller,
      new ToolBudgetService(budgetDb),
    );
    const result = await budgeted.execute(
      {
        title: 'شكوى',
        description: 'وصف',
        priority: 'high',
        category: 'complaint',
        confidence: 0.9,
      } as never,
      context,
    );
    expect(JSON.parse(result.content)).toMatchObject({ created: false });
  });
});

describe('record_collected_fields', () => {
  it('merges into the conversation state and records what was asked', async () => {
    const state = { collectedFields: { name: 'أحمد' }, askedFields: ['email'] };
    const update = jest.fn().mockResolvedValue({});
    const db = {
      conversationAiState: {
        findUnique: jest.fn().mockResolvedValue(state),
        update,
      },
    } as unknown as PrismaService;
    const tool = new RecordCollectedFieldsTool(db);
    const result = await tool.execute(
      { collected: { email: 'a@b.c' }, asked: ['email', 'name'] },
      context,
    );
    expect(JSON.parse(result.content)).toMatchObject({ saved: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          collectedFields: { name: 'أحمد', email: 'a@b.c' },
          askedFields: ['email', 'name'],
        },
      }),
    );
  });

  it('refuses keys outside the configured collection fields', async () => {
    const db = { conversationAiState: {} } as unknown as PrismaService;
    const tool = new RecordCollectedFieldsTool(db);
    const result = await tool.execute(
      { collected: { favoriteColor: 'blue' }, asked: [] },
      context,
    );
    expect(JSON.parse(result.content)).toMatchObject({ saved: false });
  });
});
