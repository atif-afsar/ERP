import { createHash } from 'node:crypto';
import { PoolClient } from 'pg';
import { query } from '../db.js';

export interface RetrievedKnowledge {
  id: string;
  documentId: string;
  title: string;
  sourcePath: string | null;
  content: string;
  score: number;
}

export function chunkKnowledge(content: string): Array<{ heading: string | null; content: string; tokenEstimate: number }> {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const sections = normalized.split(/\n(?=#{1,3}\s)/).filter(Boolean);
  const raw = sections.length > 1 ? sections : normalized.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const section of raw) {
    if (current && current.length + section.length > 3500) { chunks.push(current.trim()); current = ''; }
    current += `${current ? '\n\n' : ''}${section.trim()}`;
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(x => x.length >= 20).slice(0, 100).map(text => {
    const headingMatch = text.match(/^#{1,3}\s+(.+)$/m);
    return { heading: headingMatch?.[1]?.trim().slice(0, 300) || null, content: text.slice(0, 12000), tokenEstimate: Math.max(1, Math.ceil(text.length / 4)) };
  });
}

export function knowledgeHash(content: string): string {
  return createHash('sha256').update(content.replace(/\s+/g, ' ').trim()).digest('hex');
}

export async function insertKnowledgeChunks(client: PoolClient, documentId: string, tenantId: string | null, content: string) {
  const chunks = chunkKnowledge(content);
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    await client.query(
      `INSERT INTO ai_knowledge_chunks(document_id,tenant_id,chunk_index,heading,content,token_estimate)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [documentId, tenantId, index, chunk.heading, chunk.content, chunk.tokenEstimate]
    );
  }
  return chunks.length;
}

export async function retrieveKnowledge(tenantId: string, role: string, question: string, limit = 6): Promise<RetrievedKnowledge[]> {
  const stopWords = new Set(['the','and','for','with','from','this','that','what','when','where','which','who','why','how','does','work','can','could','would','should','want','need','please','tell','about','into','your','you','our','edunexus']);
  const terms = Array.from(new Set((question.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(term => term.length >= 3 && !stopWords.has(term)))).slice(0, 12);
  if (!terms.length) return [];
  const searchQuery = terms.join(' | ');
  const result = await query(
    `WITH q AS (SELECT to_tsquery('english', $3) AS value)
     SELECT c.id,c.document_id,d.title,d.source_path,c.content,
            ts_rank_cd(c.search_vector,q.value) AS score
     FROM ai_knowledge_chunks c
     JOIN ai_knowledge_documents d ON d.id=c.document_id
     CROSS JOIN q
     WHERE d.status='ACTIVE'
       AND (d.tenant_id IS NULL OR d.tenant_id=$1)
       AND (d.allowed_roles @> ARRAY['ALL']::TEXT[] OR $2=ANY(d.allowed_roles))
       AND c.search_vector @@ q.value
     ORDER BY score DESC,d.updated_at DESC,c.chunk_index
     LIMIT $4`,
    [tenantId, role, searchQuery, limit]
  );
  const stem = (word: string) => word.endsWith('ies') ? `${word.slice(0, -3)}y` : word.endsWith('s') && word.length > 4 ? word.slice(0, -1) : word;
  const queryTerms = terms.map(stem);
  const requiredMatches = Math.min(2, Math.max(1, Math.ceil(queryTerms.length * 0.5)));
  const scored = result.rows.map((row: any) => {
    const sourceTerms = new Set(((String(row.title) + ' ' + String(row.content)).toLowerCase().match(/[a-z0-9]+/g) || []).map(stem));
    return { row, matches: queryTerms.filter(term => sourceTerms.has(term)).length };
  });
  const strong = scored.filter(x => x.matches >= requiredMatches);
  // Mixed-language questions ("mujhe leave apply karni hai") often share only one
  // English word with an article; use the best such article rather than none.
  const picked = strong.length ? strong : scored.filter(x => x.matches >= 1).slice(0, 1);
  return picked.map(({ row }: any) => ({
    id: row.id, documentId: row.document_id, title: row.title, sourcePath: row.source_path,
    content: row.content, score: Number(row.score),
  }));
}
