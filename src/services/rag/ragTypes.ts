export type DocumentCategory = 
  | 'academics' 
  | 'fees_finance' 
  | 'transport' 
  | 'hostel' 
  | 'coaching' 
  | 'gate_security' 
  | 'policies' 
  | 'general';

export type TargetRole = 
  | 'all' 
  | 'admin' 
  | 'teacher' 
  | 'accountant' 
  | 'parent' 
  | 'student';

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  targetRoles: TargetRole[];
  content: string;
  embedding?: number[];
  tokenEstimate: number;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  targetRoles: TargetRole[];
  summary: string;
  content: string;
  chunks?: DocumentChunk[];
  createdAt: string;
  author: string;
  isCustom?: boolean;
}

export interface RagSearchResult {
  chunk: DocumentChunk;
  similarityScore: number;
  rank: number;
}

export interface RagCitation {
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  chunkExcerpt: string;
  similarityScore: number;
}

export interface RagResponse {
  reply: string;
  citations: RagCitation[];
  grounded: boolean;
  modelUsed: string;
  retrievalLatencyMs: number;
  generationLatencyMs: number;
  usedRole: string;
}

export interface IngestDocumentInput {
  title: string;
  category: DocumentCategory;
  targetRoles: TargetRole[];
  content: string;
  author?: string;
}
