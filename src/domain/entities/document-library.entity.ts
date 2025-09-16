/**
 * Document Library Domain Entity
 * Manages trust-specific document collections for AI-powered analysis,
 * with citation tracking, version management, and intelligent parsing
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { UserId } from './user.entity';
import type { TrustId } from './investment-trust.entity';
import type { DocumentId } from './document.entity';

export type LibraryId = string & { __brand: 'LibraryId' };
export type QueryId = string & { __brand: 'QueryId' };

export type DocumentCategory = 
  | 'annual_report'
  | 'interim_report'
  | 'rns_announcement'
  | 'factsheet'
  | 'presentation'
  | 'circular'
  | 'prospectus'
  | 'research_note'
  | 'regulatory_filing'
  | 'other';

export interface LibraryDocument {
  id: DocumentId;
  fileName: string;
  category: DocumentCategory;
  uploadedAt: Date;
  uploadedBy: UserId;
  
  // Document metadata
  period?: string; // e.g., "FY2023", "H1 2024"
  publishDate?: Date;
  pageCount: number;
  fileSize: number;
  mimeType: string;
  
  // AI processing status
  processed: boolean;
  processedAt?: Date;
  embeddings?: boolean; // Has vector embeddings
  extracted?: boolean; // Text extracted
  parsed?: boolean; // Structured data parsed
  
  // Extracted data
  extractedText?: string;
  extractedTables?: any[];
  extractedMetadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    financialPeriod?: string;
    reportType?: string;
  };
  
  // Citations tracking
  citationMap?: Map<number, string>; // Page number to text mapping
  totalPages?: number;
  
  // Version control
  version?: string;
  previousVersionId?: DocumentId;
  isLatestVersion: boolean;
  
  // Tags and notes
  tags: string[];
  notes?: string;
  highlights?: Array<{
    page: number;
    text: string;
    note?: string;
    createdBy: UserId;
    createdAt: Date;
  }>;
}

export interface QueryHistory {
  id: QueryId;
  query: string;
  response: string;
  
  // Query metadata
  timestamp: Date;
  userId: UserId;
  processingTime: number; // milliseconds
  tokensUsed: number;
  model: string;
  
  // Citations and sources
  citations: Array<{
    documentId: DocumentId;
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  
  // Quality metrics
  confidence: number;
  relevance: number;
  hallucination_check: boolean;
  verified: boolean;
  
  // User feedback
  helpful?: boolean;
  feedback?: string;
  
  // Related queries
  followUpQueries?: string[];
  relatedQueries?: QueryId[];
}

export interface PermanentQuery {
  id: string;
  query: string;
  description?: string;
  category: 'financial' | 'governance' | 'strategy' | 'risk' | 'performance';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_update';
  
  // Execution tracking
  lastRun?: Date;
  lastResult?: string;
  lastChanged?: Date; // When the answer changed
  
  // Alert conditions
  alertOnChange: boolean;
  alertKeywords?: string[]; // Alert if these appear
  
  isActive: boolean;
}

export interface DocumentComparison {
  id: string;
  documentIds: DocumentId[];
  comparisonType: 'period_over_period' | 'peer_comparison' | 'version_diff';
  
  // Comparison results
  differences: Array<{
    field: string;
    doc1Value: any;
    doc2Value: any;
    change: number | string;
    significance: 'high' | 'medium' | 'low';
  }>;
  
  summary: string;
  createdAt: Date;
  createdBy: UserId;
}

export interface DocumentLibraryProps {
  id: LibraryId;
  trustId: TrustId;
  userId: UserId; // Owner of the library
  name: string;
  description?: string;
  
  // Document collection
  documents: LibraryDocument[];
  documentCount: number;
  totalSize: number; // Total size in bytes
  
  // Query management
  queryHistory: QueryHistory[];
  permanentQueries: PermanentQuery[];
  savedQueries: Array<{
    id: string;
    name: string;
    query: string;
    category?: string;
  }>;
  
  // Comparisons
  comparisons: DocumentComparison[];
  
  // AI Configuration
  aiSettings: {
    model: 'gpt-4' | 'claude-3' | 'gemini-pro';
    temperature: number;
    maxTokens: number;
    citationRequired: boolean;
    hallucinationCheck: boolean;
    confidenceThreshold: number;
  };
  
  // Access control
  sharedWith: Array<{
    userId: UserId;
    permission: 'read' | 'write' | 'admin';
    sharedAt: Date;
  }>;
  isPublic: boolean;
  
  // Usage tracking
  usage: {
    totalQueries: number;
    totalTokensUsed: number;
    lastQueryAt?: Date;
    monthlyTokens: Map<string, number>; // YYYY-MM -> tokens
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

export class DocumentLibrary extends AggregateRoot<DocumentLibraryProps> {
  private constructor(props: DocumentLibraryProps) {
    super(props);
  }

  /**
   * Factory method to create a new Document Library
   */
  static create(props: Omit<DocumentLibraryProps, 'createdAt' | 'updatedAt' | 'documents' | 'queryHistory' | 'comparisons' | 'usage' | 'documentCount' | 'totalSize'>): Result<DocumentLibrary> {
    // Validate library name
    if (!props.name || props.name.trim().length === 0) {
      return ResultUtils.fail('Library name is required');
    }

    // Initialize usage tracking
    const initialUsage = {
      totalQueries: 0,
      totalTokensUsed: 0,
      monthlyTokens: new Map<string, number>(),
    };

    const library = new DocumentLibrary({
      ...props,
      documents: [],
      queryHistory: [],
      comparisons: [],
      documentCount: 0,
      totalSize: 0,
      usage: initialUsage,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    library.addDomainEvent('DocumentLibraryCreated', {
      libraryId: props.id,
      trustId: props.trustId,
      userId: props.userId,
      name: props.name,
    });

    return ResultUtils.ok(library);
  }

  /**
   * Add document to library
   */
  addDocument(document: Omit<LibraryDocument, 'uploadedAt'>): Result<void> {
    // Check for duplicate
    const existing = this.props.documents.find(d => d.fileName === document.fileName && d.isLatestVersion);
    if (existing) {
      return ResultUtils.fail('Document with this name already exists');
    }

    const newDocument: LibraryDocument = {
      ...document,
      uploadedAt: new Date(),
    };

    this.props.documents.push(newDocument);
    this.props.documentCount++;
    this.props.totalSize += document.fileSize;
    this.props.updatedAt = new Date();

    this.addDomainEvent('DocumentAddedToLibrary', {
      libraryId: this.props.id,
      documentId: document.id,
      fileName: document.fileName,
      category: document.category,
    });

    // Mark for AI processing
    this.scheduleProcessing(document.id);

    return ResultUtils.ok();
  }

  /**
   * Execute a query against the library
   */
  executeQuery(
    query: string,
    userId: UserId,
    options?: {
      documentsToSearch?: DocumentId[];
      requireCitations?: boolean;
      maxResults?: number;
    }
  ): Result<QueryId> {
    const queryId = this.generateQueryId();
    
    // Track query in history (response will be updated asynchronously)
    const newQuery: QueryHistory = {
      id: queryId,
      query,
      response: '', // Will be populated by AI service
      timestamp: new Date(),
      userId,
      processingTime: 0,
      tokensUsed: 0,
      model: this.props.aiSettings.model,
      citations: [],
      confidence: 0,
      relevance: 0,
      hallucination_check: this.props.aiSettings.hallucinationCheck,
      verified: false,
    };

    this.props.queryHistory.push(newQuery);
    this.props.usage.totalQueries++;
    this.props.usage.lastQueryAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent('QueryExecuted', {
      libraryId: this.props.id,
      queryId,
      query,
      documentsSearched: options?.documentsToSearch?.length || this.props.documentCount,
    });

    return ResultUtils.ok(queryId);
  }

  /**
   * Update query response (called by AI service)
   */
  updateQueryResponse(
    queryId: QueryId,
    response: string,
    citations: QueryHistory['citations'],
    metrics: {
      processingTime: number;
      tokensUsed: number;
      confidence: number;
      relevance: number;
    }
  ): Result<void> {
    const query = this.props.queryHistory.find(q => q.id === queryId);
    if (!query) {
      return ResultUtils.fail('Query not found');
    }

    query.response = response;
    query.citations = citations;
    query.processingTime = metrics.processingTime;
    query.tokensUsed = metrics.tokensUsed;
    query.confidence = metrics.confidence;
    query.relevance = metrics.relevance;

    // Update usage
    this.props.usage.totalTokensUsed += metrics.tokensUsed;
    const monthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    const currentMonthTokens = this.props.usage.monthlyTokens.get(monthKey) || 0;
    this.props.usage.monthlyTokens.set(monthKey, currentMonthTokens + metrics.tokensUsed);

    // Check confidence threshold
    if (metrics.confidence < this.props.aiSettings.confidenceThreshold) {
      this.addDomainEvent('LowConfidenceQuery', {
        libraryId: this.props.id,
        queryId,
        confidence: metrics.confidence,
        threshold: this.props.aiSettings.confidenceThreshold,
      });
    }

    this.props.updatedAt = new Date();

    return ResultUtils.ok();
  }

  /**
   * Add permanent query
   */
  addPermanentQuery(query: Omit<PermanentQuery, 'id'>): Result<void> {
    const existingQuery = this.props.permanentQueries.find(q => q.query === query.query);
    if (existingQuery) {
      return ResultUtils.fail('This permanent query already exists');
    }

    const newQuery: PermanentQuery = {
      ...query,
      id: this.generatePermanentQueryId(),
    };

    this.props.permanentQueries.push(newQuery);
    this.props.updatedAt = new Date();

    this.addDomainEvent('PermanentQueryAdded', {
      libraryId: this.props.id,
      query: query.query,
      frequency: query.frequency,
    });

    return ResultUtils.ok();
  }

  /**
   * Run permanent queries
   */
  runPermanentQueries(): Result<QueryId[]> {
    const queryIds: QueryId[] = [];
    const now = new Date();

    for (const permanentQuery of this.props.permanentQueries) {
      if (!permanentQuery.isActive) continue;

      // Check if query should run based on frequency
      if (this.shouldRunQuery(permanentQuery, now)) {
        const result = this.executeQuery(
          permanentQuery.query,
          this.props.userId,
          { requireCitations: true }
        );

        if (result.success && result.data) {
          queryIds.push(result.data);
          permanentQuery.lastRun = now;
        }
      }
    }

    this.props.updatedAt = new Date();

    return ResultUtils.ok(queryIds);
  }

  /**
   * Compare documents
   */
  compareDocuments(
    documentIds: DocumentId[],
    comparisonType: DocumentComparison['comparisonType'],
    userId: UserId
  ): Result<string> {
    if (documentIds.length < 2) {
      return ResultUtils.fail('At least 2 documents required for comparison');
    }

    // Verify all documents exist in library
    for (const docId of documentIds) {
      if (!this.props.documents.find(d => d.id === docId)) {
        return ResultUtils.fail(`Document ${docId} not found in library`);
      }
    }

    const comparisonId = this.generateComparisonId();
    
    const comparison: DocumentComparison = {
      id: comparisonId,
      documentIds,
      comparisonType,
      differences: [], // Will be populated by AI service
      summary: '', // Will be populated by AI service
      createdAt: new Date(),
      createdBy: userId,
    };

    this.props.comparisons.push(comparison);
    this.props.updatedAt = new Date();

    this.addDomainEvent('DocumentComparisonCreated', {
      libraryId: this.props.id,
      comparisonId,
      documentCount: documentIds.length,
      type: comparisonType,
    });

    return ResultUtils.ok(comparisonId);
  }

  /**
   * Mark document as processed
   */
  markDocumentProcessed(
    documentId: DocumentId,
    extractedData: {
      text: string;
      tables?: any[];
      metadata?: LibraryDocument['extractedMetadata'];
      pageCount: number;
    }
  ): Result<void> {
    const document = this.props.documents.find(d => d.id === documentId);
    if (!document) {
      return ResultUtils.fail('Document not found');
    }

    document.processed = true;
    document.processedAt = new Date();
    document.extracted = true;
    document.extractedText = extractedData.text;
    document.extractedTables = extractedData.tables;
    document.extractedMetadata = extractedData.metadata;
    document.pageCount = extractedData.pageCount;
    document.totalPages = extractedData.pageCount;

    // Create citation map
    document.citationMap = this.createCitationMap(extractedData.text, extractedData.pageCount);

    this.props.updatedAt = new Date();

    this.addDomainEvent('DocumentProcessed', {
      libraryId: this.props.id,
      documentId,
      pageCount: extractedData.pageCount,
    });

    return ResultUtils.ok();
  }

  /**
   * Share library with another user
   */
  shareWith(userId: UserId, permission: 'read' | 'write' | 'admin'): Result<void> {
    const existing = this.props.sharedWith.find(s => s.userId === userId);
    if (existing) {
      return ResultUtils.fail('Library already shared with this user');
    }

    this.props.sharedWith.push({
      userId,
      permission,
      sharedAt: new Date(),
    });

    this.props.updatedAt = new Date();

    this.addDomainEvent('LibraryShared', {
      libraryId: this.props.id,
      sharedWith: userId,
      permission,
    });

    return ResultUtils.ok();
  }

  /**
   * Get documents by category
   */
  getDocumentsByCategory(category: DocumentCategory): LibraryDocument[] {
    return this.props.documents.filter(d => d.category === category && d.isLatestVersion);
  }

  /**
   * Get latest annual report
   */
  getLatestAnnualReport(): LibraryDocument | undefined {
    return this.props.documents
      .filter(d => d.category === 'annual_report' && d.isLatestVersion)
      .sort((a, b) => (b.publishDate?.getTime() || 0) - (a.publishDate?.getTime() || 0))[0];
  }

  /**
   * Check if query should run based on frequency
   */
  private shouldRunQuery(query: PermanentQuery, now: Date): boolean {
    if (!query.lastRun) return true;

    const timeSinceLastRun = now.getTime() - query.lastRun.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;

    switch (query.frequency) {
      case 'daily':
        return timeSinceLastRun >= dayInMs;
      case 'weekly':
        return timeSinceLastRun >= 7 * dayInMs;
      case 'monthly':
        return timeSinceLastRun >= 30 * dayInMs;
      case 'quarterly':
        return timeSinceLastRun >= 90 * dayInMs;
      case 'on_update':
        // Check if documents updated since last run
        return this.props.documents.some(d => 
          d.uploadedAt > query.lastRun! || d.processedAt! > query.lastRun!
        );
      default:
        return false;
    }
  }

  /**
   * Create citation map for document
   */
  private createCitationMap(text: string, pageCount: number): Map<number, string> {
    const map = new Map<number, string>();
    
    // Simple page splitting (would be enhanced with actual PDF parsing)
    const avgCharsPerPage = text.length / pageCount;
    
    for (let page = 1; page <= pageCount; page++) {
      const start = (page - 1) * avgCharsPerPage;
      const end = page * avgCharsPerPage;
      map.set(page, text.substring(start, end));
    }
    
    return map;
  }

  /**
   * Schedule document for AI processing
   */
  private scheduleProcessing(documentId: DocumentId): void {
    this.addDomainEvent('DocumentScheduledForProcessing', {
      libraryId: this.props.id,
      documentId,
    });
  }

  // ID generators
  private generateQueryId(): QueryId {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as QueryId;
  }

  private generatePermanentQueryId(): string {
    return `pq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateComparisonId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): LibraryId { return this.props.id; }
  get trustId(): TrustId { return this.props.trustId; }
  get name(): string { return this.props.name; }
  get documentCount(): number { return this.props.documentCount; }
  get totalQueries(): number { return this.props.usage.totalQueries; }
  get monthlyTokenUsage(): number {
    const monthKey = new Date().toISOString().substring(0, 7);
    return this.props.usage.monthlyTokens.get(monthKey) || 0;
  }
}