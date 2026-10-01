import { query, transaction } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';

export interface JournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface PostJournalInput {
  tenantId: string;
  transactionDate: Date;
  description: string;
  sourceType: string;
  sourceId?: string;
  lines: JournalLineInput[];
  userId?: string;
}

export async function postJournalEntry(input: PostJournalInput, existingClient?: any) {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of input.lines) {
    totalDebit += line.debit || 0;
    totalCredit += line.credit || 0;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new AppError('Journal entry is not balanced.', 400);
  }

  if (totalDebit <= 0) {
    throw new AppError('Journal entry must have a non-zero positive amount.', 400);
  }

  if (input.lines.length < 2) {
    throw new AppError('Journal entry must have at least two lines.', 400);
  }

  const doWork = async (client: any) => {
    if (input.sourceId) {
      const existing = await client.query(
        `SELECT id FROM journal_entries WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3 AND status != 'REVERSED'`,
        [input.tenantId, input.sourceType, input.sourceId]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        return existing.rows[0].id;
      }
    }

    const { rows } = await client.query(
      `INSERT INTO journal_entries (tenant_id, entry_number, transaction_date, description, status, source_type, source_id, created_by)
       VALUES ($1, 'JV-' || to_char(now(), 'YYYYMMDD-HH24MISSMS'), $2, $3, 'POSTED', $4, $5, $6)
       RETURNING id, entry_number`,
      [input.tenantId, input.transactionDate, input.description, input.sourceType, input.sourceId || null, input.userId || null]
    );

    const journalId = rows[0].id;

    for (const line of input.lines) {
      await client.query(
        `INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [input.tenantId, journalId, line.accountId, line.debit || 0, line.credit || 0, line.description || null]
      );
    }
    
    return journalId;
  };

  if (existingClient) {
    return await doWork(existingClient);
  } else {
    return await transaction(async (client) => {
      return await doWork(client);
    });
  }
}
