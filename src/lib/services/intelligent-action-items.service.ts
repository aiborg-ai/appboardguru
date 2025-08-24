/**
 * Intelligent Action Items Service
 * AI-powered extraction, assignment, and management of action items from meeting transcriptions
 */

import { createSupabaseServerClient } from '../supabase-server';
import { chatWithOpenRouter } from '../openrouter';
import type { ActionItem } from './meeting-transcription.service';

export interface EnhancedActionItem extends ActionItem {
  extractionConfidence: number;
  assignmentConfidence: number;
  dueDateConfidence: number;
  contextSnippet: string;
  suggestedFollowUp?: string;
  dependencies?: string[];
  relatedDecisions?: string[];
  urgencyScore: number; // 0-100
  complexityScore: number; // 0-100
  extractedFrom: {
    segmentId: string;
    timestamp: number;
    speaker: string;
  };
}

export interface ParticipantMapping {
  id: string;
  name: string;
  email?: string;
  role?: string;
  commonAliases: string[]; // "John", "Mr. Smith", "CEO", etc.
  matchConfidence: number;
}

export interface ActionItemAnalysis {
  totalItems: number;
  byPriority: Record<'high' | 'medium' | 'low', number>;
  byAssignee: Record<string, number>;
  avgUrgency: number;
  avgComplexity: number;
  unassignedCount: number;
  dueDateDistribution: {
    immediate: number; // < 1 week
    shortTerm: number; // 1-4 weeks
    longTerm: number;  // > 4 weeks
    unspecified: number;
  };
}

export class IntelligentActionItemsService {
  private supabase: any;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    this.supabase = await createSupabaseServerClient();
  }

  /**
   * Extract intelligent action items from meeting transcript
   */
  async extractActionItemsFromTranscript(
    transcriptionId: string,
    transcriptSegments: any[],
    participants: ParticipantMapping[]
  ): Promise<EnhancedActionItem[]> {
    try {
      if (!this.supabase) await this.initializeSupabase();

      // Prepare transcript text with speaker attribution
      const fullTranscript = transcriptSegments
        .map(segment => `[${segment.speaker?.name || 'Unknown'}] ${segment.text}`)
        .join('\n');

      // Create participant aliases for better assignment matching
      const participantAliases = this.buildParticipantAliases(participants);

      // Use AI to extract comprehensive action items
      const aiAnalysis = await this.performIntelligentExtraction(
        fullTranscript,
        participants,
        participantAliases
      );

      // Process and enhance the extracted items
      const enhancedItems = await this.enhanceExtractedItems(
        aiAnalysis.actionItems,
        transcriptSegments,
        participants,
        transcriptionId
      );

      // Store the enhanced action items
      await this.storeActionItems(transcriptionId, enhancedItems);

      return enhancedItems;
    } catch (error) {
      console.error('Error extracting intelligent action items:', error);
      throw new Error('Failed to extract action items from transcript');
    }
  }

  /**
   * Perform AI-powered action item extraction
   */
  private async performIntelligentExtraction(
    transcript: string,
    participants: ParticipantMapping[],
    participantAliases: Record<string, string>
  ): Promise<any> {
    const participantList = participants.map(p => 
      `${p.name} (${p.role || 'Member'}) - Aliases: ${p.commonAliases.join(', ')}`
    ).join('\n');

    const extractionPrompt = `You are an expert meeting analyst specializing in action item extraction from board meeting transcripts. Your task is to identify ALL actionable items mentioned in the meeting, including implicit tasks and follow-ups.

MEETING PARTICIPANTS:
${participantList}

MEETING TRANSCRIPT:
${transcript}

Please analyze the transcript and extract action items with the following detailed information. Return a JSON response with this exact structure:

{
  "actionItems": [
    {
      "text": "Clear, actionable description of what needs to be done",
      "description": "Additional context and details if mentioned",
      "assignedTo": "Full name of the person responsible (must match participant list exactly)",
      "assignmentReasoning": "Why this person was assigned (explicit mention, role-based, etc.)",
      "dueDate": "YYYY-MM-DD or null if not specified",
      "dueDateReasoning": "How the due date was determined",
      "priority": "high|medium|low",
      "priorityReasoning": "Why this priority level",
      "category": "financial|operational|strategic|compliance|administrative|follow-up",
      "estimatedHours": "Number or null",
      "contextSnippet": "The exact quote or paraphrase from transcript that led to this action item",
      "urgencyScore": "0-100 based on language used and context",
      "complexityScore": "0-100 based on scope and requirements",
      "dependencies": ["Other action items this depends on"],
      "relatedDecisions": ["Any decisions this action item stems from"],
      "suggestedFollowUp": "Recommended next steps or check-in points"
    }
  ],
  "extractionNotes": "Any challenges or ambiguities in extraction",
  "overallMeetingTone": "formal|informal|urgent|routine",
  "actionItemDensity": "high|medium|low - how action-heavy this meeting was"
}

EXTRACTION GUIDELINES:
1. Look for explicit action items: "John will prepare...", "Sarah needs to..."
2. Identify implicit tasks: "We should review...", "Someone needs to check..."
3. Extract follow-up items: "Let's revisit this next month"
4. Consider decision-based actions: If a decision was made, what actions follow?
5. Be comprehensive but avoid duplicates
6. Assign to the most appropriate person based on role, expertise, or explicit mention
7. Infer reasonable due dates based on context ("by next meeting", "end of quarter")
8. Categorize based on the nature of the work
9. Score urgency based on language intensity and timeline
10. Score complexity based on scope, resources needed, and dependencies

Focus on creating actionable, trackable items that board members can actually execute.`;

    const response = await chatWithOpenRouter({
      message: extractionPrompt,
      context: 'Board meeting action item extraction'
    });

    if (!response.success || !response.data?.message) {
      throw new Error('AI extraction failed: ' + (response.error || 'No response'));
    }

    try {
      return JSON.parse(response.data.message);
    } catch (parseError) {
      // If JSON parsing fails, try to extract structured data from text
      console.warn('AI response was not valid JSON, attempting text parsing');
      return this.parseTextResponseToActionItems(response.data.message);
    }
  }

  /**
   * Build participant aliases for better name matching
   */
  private buildParticipantAliases(participants: ParticipantMapping[]): Record<string, string> {
    const aliases: Record<string, string> = {};

    participants.forEach(participant => {
      // Full name
      aliases[participant.name.toLowerCase()] = participant.id;
      
      // Common aliases
      participant.commonAliases.forEach(alias => {
        aliases[alias.toLowerCase()] = participant.id;
      });

      // First name
      const firstName = participant.name.split(' ')[0];
      if (firstName) {
        aliases[firstName.toLowerCase()] = participant.id;
      }

      // Last name with title
      const lastNameParts = participant.name.split(' ');
      if (lastNameParts.length > 1) {
        const lastName = lastNameParts[lastNameParts.length - 1];
        aliases[`mr. ${lastName}`.toLowerCase()] = participant.id;
        aliases[`ms. ${lastName}`.toLowerCase()] = participant.id;
        aliases[`dr. ${lastName}`.toLowerCase()] = participant.id;
      }
    });

    return aliases;
  }

  /**
   * Enhance extracted action items with additional intelligence
   */
  private async enhanceExtractedItems(
    rawItems: any[],
    transcriptSegments: any[],
    participants: ParticipantMapping[],
    transcriptionId: string
  ): Promise<EnhancedActionItem[]> {
    const enhanced: EnhancedActionItem[] = [];

    for (const [index, item] of rawItems.entries()) {
      // Find the participant ID
      const assignedParticipant = participants.find(p => 
        p.name.toLowerCase() === item.assignedTo?.toLowerCase() ||
        p.commonAliases.some(alias => alias.toLowerCase() === item.assignedTo?.toLowerCase())
      );

      // Find the source segment (approximate)
      const sourceSegment = this.findSourceSegment(item.contextSnippet, transcriptSegments);

      const enhancedItem: EnhancedActionItem = {
        id: `action_${transcriptionId}_${index + 1}`,
        text: item.text,
        description: item.description || undefined,
        assignedTo: assignedParticipant?.name || item.assignedTo,
        assignedToId: assignedParticipant?.id || undefined,
        dueDate: item.dueDate || this.predictDueDate(item.text, item.urgencyScore),
        priority: item.priority || 'medium',
        status: 'pending',
        category: item.category || 'operational',
        estimatedHours: item.estimatedHours || this.estimateHours(item.complexityScore),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Enhanced fields
        extractionConfidence: this.calculateExtractionConfidence(item),
        assignmentConfidence: assignedParticipant ? 0.9 : 0.3,
        dueDateConfidence: item.dueDate ? 0.8 : 0.4,
        contextSnippet: item.contextSnippet || '',
        suggestedFollowUp: item.suggestedFollowUp,
        dependencies: item.dependencies || [],
        relatedDecisions: item.relatedDecisions || [],
        urgencyScore: item.urgencyScore || 50,
        complexityScore: item.complexityScore || 50,
        extractedFrom: {
          segmentId: sourceSegment?.id || '',
          timestamp: sourceSegment?.startTime || Date.now(),
          speaker: sourceSegment?.speaker?.name || 'Unknown'
        }
      };

      enhanced.push(enhancedItem);
    }

    return enhanced;
  }

  /**
   * Find the source segment that likely contains the action item
   */
  private findSourceSegment(contextSnippet: string, segments: any[]): any {
    if (!contextSnippet) return null;

    // Simple text similarity matching
    const snippet = contextSnippet.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const segment of segments) {
      const segmentText = segment.text.toLowerCase();
      const commonWords = snippet.split(' ').filter(word => 
        word.length > 3 && segmentText.includes(word)
      );
      
      const score = commonWords.length / snippet.split(' ').length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = segment;
      }
    }

    return bestScore > 0.3 ? bestMatch : null;
  }

  /**
   * Calculate confidence score for extraction quality
   */
  private calculateExtractionConfidence(item: any): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for explicit language
    if (item.text.match(/\b(will|shall|must|needs? to|responsible for)\b/i)) {
      confidence += 0.3;
    }

    // Boost for specific assignee
    if (item.assignedTo && item.assignmentReasoning?.includes('explicit')) {
      confidence += 0.2;
    }

    // Boost for specific due date
    if (item.dueDate && item.dueDateReasoning?.includes('specified')) {
      confidence += 0.2;
    }

    // Boost for detailed context
    if (item.contextSnippet && item.contextSnippet.length > 50) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Predict due date based on context and urgency
   */
  private predictDueDate(actionText: string, urgencyScore: number): string | undefined {
    const text = actionText.toLowerCase();
    const now = new Date();

    // Look for time indicators
    if (text.includes('immediately') || text.includes('asap') || urgencyScore > 90) {
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 days
    }

    if (text.includes('next week') || text.includes('by friday')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    if (text.includes('next month') || text.includes('end of month')) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      return nextMonth.toISOString().split('T')[0];
    }

    if (text.includes('next quarter') || text.includes('q') && text.match(/[1-4]/)) {
      const nextQuarter = new Date(now);
      nextQuarter.setMonth(now.getMonth() + 3);
      return nextQuarter.toISOString().split('T')[0];
    }

    // Default predictions based on urgency
    if (urgencyScore > 80) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 week
    } else if (urgencyScore > 60) {
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 2 weeks
    } else {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 month
    }
  }

  /**
   * Estimate hours based on complexity
   */
  private estimateHours(complexityScore: number): number {
    if (complexityScore > 80) return 20; // Complex multi-week projects
    if (complexityScore > 60) return 8;  // Day-long tasks
    if (complexityScore > 40) return 4;  // Half-day tasks
    if (complexityScore > 20) return 2;  // Few hours
    return 1; // Simple tasks
  }

  /**
   * Store enhanced action items in database
   */
  private async storeActionItems(transcriptionId: string, actionItems: EnhancedActionItem[]): Promise<void> {
    if (!this.supabase) await this.initializeSupabase();

    try {
      // Update the meeting transcription with enhanced action items
      await this.supabase
        .from('meeting_transcriptions')
        .update({
          action_items: actionItems,
          action_item_analysis: this.generateActionItemAnalysis(actionItems),
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptionId);

      // Create individual action item records for tracking
      for (const item of actionItems) {
        await this.supabase
          .from('action_items')
          .upsert({
            id: item.id,
            transcription_id: transcriptionId,
            title: item.text,
            description: item.description,
            assigned_to: item.assignedToId,
            assigned_to_name: item.assignedTo,
            due_date: item.dueDate,
            priority: item.priority,
            status: item.status,
            category: item.category,
            estimated_hours: item.estimatedHours,
            extraction_confidence: item.extractionConfidence,
            assignment_confidence: item.assignmentConfidence,
            urgency_score: item.urgencyScore,
            complexity_score: item.complexityScore,
            context_snippet: item.contextSnippet,
            suggested_follow_up: item.suggestedFollowUp,
            dependencies: item.dependencies,
            created_at: item.createdAt,
            updated_at: item.updatedAt
          });
      }
    } catch (error) {
      console.error('Error storing action items:', error);
      throw new Error('Failed to store action items');
    }
  }

  /**
   * Generate analysis of action items
   */
  private generateActionItemAnalysis(actionItems: EnhancedActionItem[]): ActionItemAnalysis {
    const analysis: ActionItemAnalysis = {
      totalItems: actionItems.length,
      byPriority: { high: 0, medium: 0, low: 0 },
      byAssignee: {},
      avgUrgency: 0,
      avgComplexity: 0,
      unassignedCount: 0,
      dueDateDistribution: {
        immediate: 0,
        shortTerm: 0,
        longTerm: 0,
        unspecified: 0
      }
    };

    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

    actionItems.forEach(item => {
      // Priority distribution
      analysis.byPriority[item.priority]++;

      // Assignee distribution
      if (item.assignedTo) {
        analysis.byAssignee[item.assignedTo] = (analysis.byAssignee[item.assignedTo] || 0) + 1;
      } else {
        analysis.unassignedCount++;
      }

      // Urgency and complexity
      analysis.avgUrgency += item.urgencyScore;
      analysis.avgComplexity += item.complexityScore;

      // Due date distribution
      if (!item.dueDate) {
        analysis.dueDateDistribution.unspecified++;
      } else {
        const dueDate = new Date(item.dueDate);
        if (dueDate <= oneWeek) {
          analysis.dueDateDistribution.immediate++;
        } else if (dueDate <= fourWeeks) {
          analysis.dueDateDistribution.shortTerm++;
        } else {
          analysis.dueDateDistribution.longTerm++;
        }
      }
    });

    if (actionItems.length > 0) {
      analysis.avgUrgency = analysis.avgUrgency / actionItems.length;
      analysis.avgComplexity = analysis.avgComplexity / actionItems.length;
    }

    return analysis;
  }

  /**
   * Parse text response when JSON fails
   */
  private parseTextResponseToActionItems(textResponse: string): any {
    // Basic fallback parsing
    const lines = textResponse.split('\n').filter(line => line.trim());
    const actionItems = [];

    let currentItem: any = null;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('action') && lowerLine.includes(':')) {
        if (currentItem) {
          actionItems.push(currentItem);
        }
        currentItem = {
          text: line.replace(/^.*?:/, '').trim(),
          priority: 'medium',
          urgencyScore: 50,
          complexityScore: 50,
          contextSnippet: line
        };
      } else if (currentItem && lowerLine.includes('assign')) {
        currentItem.assignedTo = line.replace(/^.*?:/, '').trim();
      } else if (currentItem && lowerLine.includes('due')) {
        currentItem.dueDate = line.replace(/^.*?:/, '').trim();
      }
    }

    if (currentItem) {
      actionItems.push(currentItem);
    }

    return {
      actionItems,
      extractionNotes: 'Parsed from text response',
      overallMeetingTone: 'unknown',
      actionItemDensity: 'medium'
    };
  }

  /**
   * Get action items for a user
   */
  async getUserActionItems(userId: string, status?: string): Promise<EnhancedActionItem[]> {
    if (!this.supabase) await this.initializeSupabase();

    try {
      let query = this.supabase
        .from('action_items')
        .select('*')
        .eq('assigned_to', userId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('due_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching user action items:', error);
      throw new Error('Failed to fetch action items');
    }
  }

  /**
   * Update action item status
   */
  async updateActionItemStatus(
    actionItemId: string, 
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    userId: string
  ): Promise<void> {
    if (!this.supabase) await this.initializeSupabase();

    try {
      await this.supabase
        .from('action_items')
        .update({
          status,
          updated_at: new Date().toISOString(),
          completed_by: status === 'completed' ? userId : null,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', actionItemId);
    } catch (error) {
      console.error('Error updating action item status:', error);
      throw new Error('Failed to update action item');
    }
  }

  /**
   * Get action items with filters
   */
  async getActionItems(filters: any = {}): Promise<EnhancedActionItem[]> {
    if (!this.supabase) await this.initializeSupabase();

    try {
      let query = this.supabase
        .from('action_items')
        .select('*');

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching action items:', error);
      throw new Error('Failed to fetch action items');
    }
  }

  /**
   * Create a new action item
   */
  async createActionItem(itemData: any): Promise<EnhancedActionItem> {
    if (!this.supabase) await this.initializeSupabase();

    try {
      const actionItem = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: itemData.title,
        description: itemData.description,
        assigned_to: itemData.assignedTo,
        assigned_to_name: itemData.assignedToName,
        due_date: itemData.dueDate,
        priority: itemData.priority,
        status: 'pending',
        category: itemData.category,
        estimated_hours: itemData.estimatedHours,
        organization_id: itemData.organizationId,
        transcription_id: itemData.transcriptionId,
        created_by: itemData.createdBy,
        extraction_confidence: itemData.extractionConfidence,
        assignment_confidence: itemData.assignmentConfidence,
        due_date_confidence: itemData.dueDateConfidence,
        urgency_score: itemData.urgencyScore,
        complexity_score: itemData.complexityScore,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('action_items')
        .insert(actionItem)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating action item:', error);
      throw new Error('Failed to create action item');
    }
  }
}

export const intelligentActionItemsService = new IntelligentActionItemsService();