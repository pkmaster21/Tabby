import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db, members, expenses, expenseSplits, groups, activityLog } from '../db/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { requireSession, requireGroupMember } from '../plugins/session.js';
import { groupExpiresAt } from '../lib/time.js';

export async function settleRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/groups/:id/settle',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['from', 'to', 'amountCents'],
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            amountCents: { type: 'integer', minimum: 1 },
          },
        },
        tags: ['balances'],
        summary: 'Record a settlement payment between two members',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { from, to, amountCents } = request.body as {
        from: string;
        to: string;
        amountCents: number;
      };

      const [group] = await db.select().from(groups).where(eq(groups.id, id));
      if (!group) return reply.status(404).send({ error: 'Group not found' });
      if (group.expiresAt < new Date()) {
        return reply.status(410).send({ error: 'Group has expired' });
      }

      const memberRows = await db
        .select({ id: members.id, displayName: members.displayName })
        .from(members)
        .where(and(eq(members.groupId, id), isNull(members.leftAt)));

      const memberMap = new Map(memberRows.map((m) => [m.id, m.displayName]));
      if (!memberMap.has(from) || !memberMap.has(to)) {
        return reply.status(400).send({ error: 'Invalid member IDs' });
      }

      // Record the settlement as an exact-split expense so the ledger stays
      // consistent: paidBy=from credits `from`, split on `to` debits `to`.
      const amount = String(amountCents / 100);
      const expenseId = randomUUID();

      await db.insert(expenses).values({
        id: expenseId,
        groupId: id,
        paidBy: from,
        amount,
        description: '💸 Settlement',
        splitType: 'exact',
      });

      await db.insert(expenseSplits).values({
        expenseId,
        memberId: to,
        amount,
      });

      await db.insert(activityLog).values({
        groupId: id,
        message: `${memberMap.get(from)} settled $${(amountCents / 100).toFixed(2)} with ${memberMap.get(to)}`,
      });

      await db.update(groups).set({ expiresAt: groupExpiresAt() }).where(eq(groups.id, id));

      return reply.status(204).send();
    },
  );
}
