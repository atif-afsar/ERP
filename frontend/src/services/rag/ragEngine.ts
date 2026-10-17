import { 
  KnowledgeDocument, 
  DocumentChunk, 
  RagSearchResult, 
  RagCitation, 
  RagResponse, 
  IngestDocumentInput, 
  TargetRole 
} from './ragTypes';
import { DEFAULT_CAMPUS_DOCUMENTS } from './defaultCampusDocs';

// Local Grounded Vector Engine (Client-side secrets removed; server-side proxy retained for Phase 8)

// In-memory runtime state
let activeDocuments: KnowledgeDocument[] = [];
let allIndexedChunks: DocumentChunk[] = [];
const embeddingsCache: Map<string, number[]> = new Map();

/**
 * Common English stop words to filter out of search queries
 */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 
  'aren', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 
  'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your'
]);

/**
 * High-precision domain synonym mappings for campus operations
 */
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  fee: ['fees', 'tuition', 'payment', 'installment', 'byok', 'gateway', 'receipt', 'dues', 'collection', 'invoicing', 'gst', 'scholarship', 'concession', 'razorpay'],
  fees: ['fee', 'tuition', 'payment', 'installment', 'byok', 'gateway', 'receipt', 'dues', 'collection', 'invoicing', 'gst', 'scholarship', 'concession', 'razorpay'],
  tuition: ['fee', 'fees', 'payment', 'installment', 'byok', 'receipt', 'dues', 'collection'],
  payment: ['fee', 'fees', 'tuition', 'gateway', 'razorpay', 'cashfree', 'byok', 'receipt', 'settlement', 'collection'],
  collection: ['fee', 'fees', 'tuition', 'dues', 'receipt', 'installment', 'collect', 'desk', 'payment'],
  collect: ['fee', 'fees', 'tuition', 'collection', 'payment', 'receipt'],
  attendance: ['present', 'absent', 'register', 'rollcall', 'gate', 'turnstile', 'biometric', 'qr', 'scanner', 'kiosk', '75%'],
  qr: ['scanner', 'kiosk', 'gate', 'attendance', 'turnstile', 'code', 'id card', 'smart card'],
  kiosk: ['gate', 'qr', 'turnstile', 'scanner', 'biometric', 'attendance'],
  turnstile: ['gate', 'qr', 'kiosk', 'rfid', 'security', 'scanner', 'entry'],
  grading: ['cbse', '8-point', 'gpa', 'marks', 'report card', 'exam', 'assessment', 'nep', 'scholastic'],
  cbse: ['grading', '8-point', 'scale', 'term', 'report card', 'nep', 'assessment', 'weightage'],
  exam: ['examination', 'marks', 'test', 'grading', 'cbse', 'report card', 'jee', 'neet', 'assessment'],
  exams: ['examination', 'marks', 'test', 'grading', 'cbse', 'report card', 'jee', 'neet', 'assessment'],
  marks: ['grading', 'scores', 'cbse', 'report card', 'gpa', 'omr', 'scale'],
  bus: ['transport', 'fleet', 'gps', 'driver', 'route', 'telemetry', 'pickup', 'speed'],
  transport: ['bus', 'fleet', 'gps', 'route', 'driver', 'telemetry', 'ais-140'],
  fleet: ['bus', 'transport', 'gps', 'route', 'driver', 'telemetry'],
  gps: ['transport', 'bus', 'telemetry', 'route', 'tracking', 'geofence', 'speed'],
  hostel: ['residential', 'boarding', 'room', 'curfew', 'warden', 'mess', 'dining', 'outpass'],
  mess: ['dining', 'food', 'meal', 'nutrition', 'hostel', 'menu', 'fssai', 'vegetarian'],
  curfew: ['hostel', 'timing', 'warden', 'boarding', 'rollcall', 'hours'],
  coaching: ['jee', 'neet', 'batch', 'nurture', 'enthuse', 'omr', 'air', 'percentile', 'test series'],
  jee: ['coaching', 'neet', 'test series', 'percentile', 'omr', 'marking', 'nurture', 'enthuse'],
  neet: ['coaching', 'jee', 'biology', 'omr', 'percentile', 'marking', 'test series'],
  omr: ['optical', 'scanning', 'coaching', 'exam', 'camera', 'test series'],
  payroll: ['salary', 'staff', 'hr', 'pf', 'esi', 'payslip', 'deduction'],
  salary: ['payroll', 'staff', 'payslip', 'pf', 'esi', 'allowance', 'deductions'],
};

/**
 * Intelligent text chunker: divides a document into coherent semantic sections
 */
function chunkDocument(doc: KnowledgeDocument): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const rawSections = doc.content.split(/\n(?=##\s+)/g);

  rawSections.forEach((section, index) => {
    const trimmed = section.trim();
    if (!trimmed) return;

    // Estimate token count (~4 characters per token)
    const tokenEstimate = Math.ceil(trimmed.length / 4);

    chunks.push({
      id: `${doc.id}-chunk-${index + 1}`,
      documentId: doc.id,
      documentTitle: doc.title,
      category: doc.category,
      targetRoles: doc.targetRoles,
      content: trimmed,
      tokenEstimate,
    });
  });

  return chunks;
}

/**
 * Extract clean, normalized keywords from query, expanding with domain synonyms
 */
function extractAndExpandKeywords(text: string): { primary: string[]; expanded: string[] } {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const rawTokens = clean.split(/\s+/).filter(t => t.length >= 2);
  const primary = rawTokens.filter(t => !STOP_WORDS.has(t));

  const expandedSet = new Set<string>();
  primary.forEach(token => {
    expandedSet.add(token);
    // Add plural/singular variations
    if (token.endsWith('s') && token.length > 3) expandedSet.add(token.slice(0, -1));
    else expandedSet.add(token + 's');

    if (DOMAIN_SYNONYMS[token]) {
      DOMAIN_SYNONYMS[token].forEach(syn => expandedSet.add(syn));
    }
  });

  return {
    primary,
    expanded: Array.from(expandedSet)
  };
}

/**
 * Computes cosine similarity between two numeric vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Fetch vector embedding from Google Gemini Embedding API (if valid key is configured)
 */
async function fetchGeminiEmbedding(_text: string): Promise<number[] | null> {
  // Client-side API calls disabled; server-side embedding proxy retained for Phase 8
  return null;
}

/**
 * Initializes the RAG Knowledge Store by indexing default and custom documents
 */
export function initializeRagStore(): void {
  activeDocuments = [...DEFAULT_CAMPUS_DOCUMENTS];
  allIndexedChunks = [];

  activeDocuments.forEach(doc => {
    const chunks = chunkDocument(doc);
    doc.chunks = chunks;
    allIndexedChunks.push(...chunks);
  });
}

// Initial boot
initializeRagStore();

/**
 * Retrieve Top-K relevant document chunks using hybrid BM25/keyword scoring
 * with semantic domain expansion
 */
export async function retrieveRelevantChunks(
  query: string, 
  userRole: TargetRole = 'all', 
  topK = 3
): Promise<RagSearchResult[]> {
  if (allIndexedChunks.length === 0) {
    initializeRagStore();
  }

  const { primary, expanded } = extractAndExpandKeywords(query);
  const queryEmbedding = await fetchGeminiEmbedding(query);

  const scoredResults: RagSearchResult[] = allIndexedChunks.map(chunk => {
    let score = 0;

    // 1. If high-dimensional Gemini embeddings are available
    if (queryEmbedding && chunk.embedding && chunk.embedding.length === queryEmbedding.length) {
      score = cosineSimilarity(queryEmbedding, chunk.embedding);
    } else {
      // 2. High-precision Hybrid BM25 & Semantic Matcher
      if (primary.length === 0) {
        return { chunk, similarityScore: 0, rank: 0 };
      }

      const contentLower = chunk.content.toLowerCase();
      const titleLower = chunk.documentTitle.toLowerCase();
      const categoryLower = chunk.category.toLowerCase();

      let directMatches = 0;
      let expandedMatches = 0;
      let titleMatches = 0;

      // Check primary keywords
      primary.forEach(kw => {
        if (titleLower.includes(kw)) {
          titleMatches += 3.5;
          directMatches += 2.0;
        }
        if (categoryLower.includes(kw)) {
          titleMatches += 2.0;
          directMatches += 1.5;
        }
        if (contentLower.includes(kw)) {
          directMatches += 1.0;
        }
      });

      // Check semantic synonym matches
      expanded.forEach(syn => {
        if (!primary.includes(syn)) {
          if (titleLower.includes(syn)) titleMatches += 1.5;
          if (contentLower.includes(syn)) expandedMatches += 0.8;
        }
      });

      // If zero primary and zero expanded keywords match this chunk, score is STRICTLY 0
      if (directMatches === 0 && expandedMatches === 0 && titleMatches === 0) {
        score = 0;
      } else {
        // Calculate normalized relevance score
        const totalWeightedPoints = titleMatches * 1.5 + directMatches * 1.0 + expandedMatches * 0.5;
        const maxExpected = Math.max(2, primary.length * 3.0);
        score = Math.min(0.98, totalWeightedPoints / maxExpected);

        // Boost score if the primary concept strongly intersects with the title
        if (titleMatches > 0) {
          score = Math.min(0.99, score * 1.25);
        }
      }
    }

    // Role-perspective relevance multiplier (ONLY applied if base score is already positive)
    if (score > 0.15 && userRole !== 'all') {
      if (chunk.targetRoles.includes(userRole)) {
        score = Math.min(1.0, score + 0.05);
      }
    }

    return {
      chunk,
      similarityScore: Math.round(score * 100) / 100,
      rank: 0
    };
  });

  // Filter out zero and low-relevance noise, sort descending
  const relevantResults = scoredResults
    .filter(r => r.similarityScore >= 0.25)
    .sort((a, b) => b.similarityScore - a.similarityScore);

  return relevantResults.slice(0, topK).map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}

/**
 * Synthesizes a structured, fact-grounded response from verified campus document chunks
 */
function synthesizeGroundedResponse(topResults: RagSearchResult[], userRole: TargetRole): string {
  const best = topResults[0];
  if (!best || best.similarityScore < 0.25) {
    return '';
  }

  const chunk = best.chunk;
  const rawContent = chunk.content;

  // Extract clean lines without leading headers
  const lines = rawContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Group into title, section header, and bullet points
  let sectionHeader = '';
  const bulletPoints: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      sectionHeader = line.replace('## ', '').trim();
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      bulletPoints.push(line.replace(/^[-*•]\s*/, ''));
    } else if (!line.startsWith('# ') && line.length > 25) {
      bulletPoints.push(line);
    }
  }

  const roleText = userRole !== 'all' ? ` *(tailored for ${userRole.toUpperCase()})*` : '';

  let reply = `### 📋 Official Campus Bylaw: ${chunk.documentTitle}${roleText}\n\n`;

  if (sectionHeader) {
    reply += `**${sectionHeader}**\n\n`;
  }

  if (bulletPoints.length > 0) {
    bulletPoints.slice(0, 5).forEach(pt => {
      reply += `• ${pt}\n`;
    });
  } else {
    reply += `${rawContent.slice(0, 380)}...\n`;
  }

  return reply.trim();
}

/**
 * Execute Retrieval-Augmented Generation (RAG) query
 */
export async function executeRagQuery(
  query: string,
  userRole: TargetRole = 'all',
  contextDetails?: { currentRoute?: string; tenantName?: string; isSchool?: boolean }
): Promise<RagResponse> {
  const startTime = Date.now();

  // 1. Retrieve top-k context chunks using hybrid retrieval
  const topResults = await retrieveRelevantChunks(query, userRole, 3);
  const retrievalLatencyMs = Date.now() - startTime;

  // Format citations
  const citations: RagCitation[] = topResults.map(r => ({
    documentId: r.chunk.documentId,
    documentTitle: r.chunk.documentTitle,
    category: r.chunk.category,
    chunkExcerpt: r.chunk.content.slice(0, 180) + '...',
    similarityScore: r.similarityScore
  }));

  const genStartTime = Date.now();



  // 3. Grounded Local Synthesizer
  const localGroundedReply = synthesizeGroundedResponse(topResults, userRole);

  return {
    reply: localGroundedReply,
    citations,
    grounded: citations.length > 0,
    modelUsed: 'EduNexus Local Grounded Vector Engine',
    retrievalLatencyMs,
    generationLatencyMs: Date.now() - genStartTime,
    usedRole: userRole
  };
}

/**
 * Ingest a new custom document into the live RAG vector store
 */
export function ingestCustomDocument(input: IngestDocumentInput): KnowledgeDocument {
  const newDoc: KnowledgeDocument = {
    id: `custom-doc-${Date.now()}`,
    title: input.title.trim(),
    category: input.category,
    targetRoles: input.targetRoles.length > 0 ? input.targetRoles : ['all'],
    summary: input.content.slice(0, 120).trim() + '...',
    content: input.content.trim(),
    createdAt: new Date().toISOString().split('T')[0],
    author: input.author || 'School Administrator',
    isCustom: true
  };

  const chunks = chunkDocument(newDoc);
  newDoc.chunks = chunks;

  activeDocuments.push(newDoc);
  allIndexedChunks.push(...chunks);

  return newDoc;
}

/**
 * Return all currently indexed documents
 */
export function getAllRagDocuments(): KnowledgeDocument[] {
  if (activeDocuments.length === 0) {
    initializeRagStore();
  }
  return [...activeDocuments];
}

/**
 * Delete a custom document
 */
export function deleteCustomDocument(id: string): boolean {
  activeDocuments = activeDocuments.filter(d => d.id !== id);
  allIndexedChunks = allIndexedChunks.filter(c => c.documentId !== id);

  return true;
}
