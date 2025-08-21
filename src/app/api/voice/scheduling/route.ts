import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  VoiceSchedulingRequest,
  VoiceSchedulingResponse,
  SchedulingIntent,
  SchedulingAction,
  Suggestion,
  Clarification,
  MeetingDetails,
  AlternativeOption
} from '@/types/voice-scheduling';

// POST - Process voice scheduling command
export async function POST(request: NextRequest) {
  try {
    const body: VoiceSchedulingRequest = await request.json();
    const { command, audioData, context, preferences, constraints } = body;

    if (!command || !context?.userId || !context?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Process the voice command
    const result = await processVoiceSchedulingCommand(
      supabase,
      command,
      audioData,
      context,
      preferences,
      constraints
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Voice scheduling error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process voice scheduling command' },
      { status: 500 }
    );
  }
}

async function processVoiceSchedulingCommand(
  supabase: any,
  command: string,
  audioData?: string,
  context?: any,
  preferences?: any,
  constraints?: any
): Promise<VoiceSchedulingResponse> {
  
  // Simulate intent recognition using simple keyword matching
  const intent = recognizeIntent(command);
  const confidence = calculateConfidence(command, intent);
  const sessionId = `session-${Date.now()}`;

  // Extract entities from the command
  const entities = extractEntities(command, intent);
  
  // Generate actions based on intent
  const actions = generateActions(intent, entities, context);
  
  // Generate suggestions and alternatives
  const suggestions = generateSuggestions(intent, entities, context);
  
  // Check for clarifications needed
  const clarifications = generateClarifications(intent, entities);
  
  // Generate contextual response
  const response = generateResponse(intent, entities, actions, suggestions);

  return {
    success: true,
    sessionId,
    intent,
    confidence,
    response,
    actions,
    suggestions,
    clarifications
  };
}

function recognizeIntent(command: string): SchedulingIntent {
  const lowercaseCommand = command.toLowerCase();
  
  // Intent patterns
  const intentPatterns: Record<SchedulingIntent, string[]> = {
    schedule_meeting: [
      'schedule', 'book', 'set up', 'arrange', 'plan', 'create meeting',
      'meeting', 'call', 'conference', 'session'
    ],
    reschedule_meeting: [
      'reschedule', 'move', 'change', 'shift', 'update time',
      'postpone', 'delay', 'bring forward'
    ],
    cancel_meeting: [
      'cancel', 'delete', 'remove', 'abort', 'call off'
    ],
    check_availability: [
      'check', 'availability', 'free time', 'open slots',
      'when free', 'available', 'calendar'
    ],
    find_time_slot: [
      'find time', 'available time', 'open time',
      'free slot', 'time slot', 'best time'
    ],
    book_resource: [
      'book room', 'reserve', 'conference room',
      'meeting room', 'resource', 'equipment'
    ],
    set_recurring_meeting: [
      'recurring', 'weekly', 'monthly', 'daily',
      'regular', 'repeating', 'series'
    ],
    add_participants: [
      'add', 'invite', 'include', 'participant',
      'attendee', 'join', 'bring in'
    ],
    change_duration: [
      'extend', 'shorten', 'duration', 'longer',
      'shorter', 'time', 'minutes', 'hours'
    ],
    suggest_alternatives: [
      'alternative', 'other options', 'different time',
      'suggest', 'recommend', 'options'
    ],
    block_calendar: [
      'block', 'busy', 'unavailable', 'out of office',
      'vacation', 'travel', 'holiday'
    ],
    create_event_series: [
      'series', 'multiple meetings', 'event series',
      'workshop series', 'training series'
    ]
  };

  // Score each intent based on keyword matches
  let bestIntent: SchedulingIntent = 'schedule_meeting';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(intentPatterns)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowercaseCommand.includes(keyword)) {
        score += keyword.length; // Weight longer matches higher
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as SchedulingIntent;
    }
  }

  return bestIntent;
}

function calculateConfidence(command: string, intent: SchedulingIntent): number {
  // Simple confidence calculation based on command clarity and completeness
  let confidence = 0.7; // Base confidence
  
  // Boost confidence for specific patterns
  const lowercaseCommand = command.toLowerCase();
  
  // Clear time indicators
  if (lowercaseCommand.match(/\b(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)) {
    confidence += 0.1;
  }
  
  if (lowercaseCommand.match(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/)) {
    confidence += 0.1;
  }
  
  // Specific participants mentioned
  if (lowercaseCommand.match(/\bwith\b.*\b(team|person|people)\b/)) {
    confidence += 0.05;
  }
  
  // Duration specified
  if (lowercaseCommand.match(/\b\d+\s*(hour|minute|hr|min)s?\b/)) {
    confidence += 0.05;
  }
  
  // Meeting type specified
  if (lowercaseCommand.match(/\b(board|quarterly|monthly|weekly|daily|standup|review|planning)\b/)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

function extractEntities(command: string, intent: SchedulingIntent): any[] {
  const entities = [];
  const lowercaseCommand = command.toLowerCase();

  // Extract time entities
  const timePatterns = [
    { pattern: /\b(tomorrow|today)\b/, type: 'relative_date' },
    { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, type: 'day_of_week' },
    { pattern: /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/, type: 'time' },
    { pattern: /\b(next|this)\s+(week|month|year)\b/, type: 'relative_period' },
    { pattern: /\b\d+\s*(hour|minute|hr|min)s?\b/, type: 'duration' }
  ];

  timePatterns.forEach(({ pattern, type }) => {
    const match = lowercaseCommand.match(pattern);
    if (match) {
      entities.push({
        type,
        value: match[0],
        confidence: 0.9,
        source: 'speech',
        validated: false
      });
    }
  });

  // Extract participant entities
  const participantPattern = /\bwith\s+([\w\s,]+?)(?:\s+(?:at|on|in|\.|$))/;
  const participantMatch = lowercaseCommand.match(participantPattern);
  if (participantMatch?.[1]) {
    entities.push({
      type: 'participants',
      value: participantMatch[1].trim(),
      confidence: 0.8,
      source: 'speech',
      validated: false
    });
  }

  // Extract meeting type
  const meetingTypes = ['board', 'quarterly', 'monthly', 'weekly', 'daily', 'standup', 'review', 'planning', 'presentation'];
  meetingTypes.forEach(type => {
    if (lowercaseCommand.includes(type)) {
      entities.push({
        type: 'meeting_type',
        value: type,
        confidence: 0.85,
        source: 'speech',
        validated: false
      });
    }
  });

  // Extract location entities
  const locationPattern = /\b(?:in|at)\s+([\w\s]+?)(?:\s+(?:at|on|with|\.|$))/;
  const locationMatch = lowercaseCommand.match(locationPattern);
  if (locationMatch?.[1]) {
    entities.push({
      type: 'location',
      value: locationMatch[1]?.trim() || '',
      confidence: 0.7,
      source: 'speech',
      validated: false
    });
  }

  return entities;
}

function generateActions(intent: SchedulingIntent, entities: any[], context: any): SchedulingAction[] {
  const actions: SchedulingAction[] = [];

  switch (intent) {
    case 'schedule_meeting':
      actions.push({
        action: 'create_meeting',
        type: 'create',
        target: 'meeting',
        parameters: {
          title: extractMeetingTitle(entities),
          participants: extractParticipants(entities),
          datetime: extractDateTime(entities),
          duration: extractDuration(entities) || 60,
          location: extractLocation(entities) || 'TBD'
        },
        confidence: 0.85,
        impact: {
          participants: extractParticipants(entities) || ['organizer'],
          timeSlots: [{
            start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1 hour
            duration: 60,
            timezone: context?.timeZone || 'UTC',
            availability: 'free'
          }],
          resources: [],
          estimated_effort: 5,
          reversible: true
        }
      });
      break;

    case 'check_availability':
      actions.push({
        action: 'check_participant_availability',
        type: 'query',
        target: 'calendar',
        parameters: {
          participants: extractParticipants(entities) || [],
          timeframe: extractTimeFrame(entities) || 'this_week'
        },
        confidence: 0.9,
        impact: {
          participants: extractParticipants(entities) || [],
          timeSlots: [],
          resources: [],
          estimated_effort: 2,
          reversible: true
        }
      });
      break;

    case 'reschedule_meeting':
      actions.push({
        action: 'update_meeting_time',
        type: 'update',
        target: 'meeting',
        parameters: {
          meeting_reference: extractMeetingReference(entities),
          new_datetime: extractDateTime(entities),
          notify_participants: true
        },
        confidence: 0.8,
        impact: {
          participants: ['all_participants'],
          timeSlots: [{
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            duration: 60,
            timezone: context?.timeZone || 'UTC',
            availability: 'busy'
          }],
          resources: [],
          estimated_effort: 3,
          reversible: true
        }
      });
      break;

    case 'find_time_slot':
      actions.push({
        action: 'find_optimal_time',
        type: 'suggest',
        target: 'time_slot',
        parameters: {
          participants: extractParticipants(entities) || [],
          duration: extractDuration(entities) || 60,
          preferences: context?.preferences || {},
          constraints: extractConstraints(entities)
        },
        confidence: 0.88,
        impact: {
          participants: extractParticipants(entities) || [],
          timeSlots: [],
          resources: [],
          estimated_effort: 4,
          reversible: true
        }
      });
      break;

    default:
      actions.push({
        action: 'acknowledge_command',
        type: 'query',
        target: 'system',
        parameters: {
          intent,
          entities,
          requires_clarification: true
        },
        confidence: 0.6,
        impact: {
          participants: [],
          timeSlots: [],
          resources: [],
          estimated_effort: 1,
          reversible: true
        }
      });
  }

  return actions;
}

function generateSuggestions(intent: SchedulingIntent, entities: any[], context: any): Suggestion[] {
  const suggestions: Suggestion[] = [];

  switch (intent) {
    case 'schedule_meeting':
      suggestions.push(
        {
          type: 'alternative_time',
          content: 'Consider scheduling during typical business hours (9 AM - 5 PM) for better attendance.',
          confidence: 0.8,
          rationale: 'Based on participant availability patterns',
          impact: {
            beneficiaries: ['all_participants'],
            trade_offs: ['Limited weekend availability'],
            estimated_improvement: 25,
            effort_required: 'low'
          }
        },
        {
          type: 'optimization',
          content: 'Set up a recurring meeting if this is part of a regular series.',
          confidence: 0.7,
          rationale: 'Detected potential pattern in meeting title',
          impact: {
            beneficiaries: ['organizer', 'participants'],
            trade_offs: ['Less flexibility for individual meetings'],
            estimated_improvement: 40,
            effort_required: 'low'
          }
        }
      );
      break;

    case 'check_availability':
      suggestions.push({
        type: 'optimization',
        content: 'I can automatically find the best time slot based on everyone\'s availability.',
        confidence: 0.85,
        rationale: 'Multiple participants detected',
        impact: {
          beneficiaries: ['organizer'],
          trade_offs: ['Automated selection may not account for all preferences'],
          estimated_improvement: 60,
          effort_required: 'low'
        }
      });
      break;

    case 'find_time_slot':
      suggestions.push({
        type: 'alternative_time',
        content: 'Consider Tuesday through Thursday for better meeting effectiveness.',
        confidence: 0.75,
        rationale: 'Research shows mid-week meetings have higher engagement',
        impact: {
          beneficiaries: ['all_participants'],
          trade_offs: ['May conflict with existing Tuesday-Thursday meetings'],
          estimated_improvement: 20,
          effort_required: 'low'
        }
      });
      break;
  }

  return suggestions;
}

function generateClarifications(intent: SchedulingIntent, entities: any[]): Clarification[] {
  const clarifications: Clarification[] = [];
  
  // Check for missing required information
  const hasTime = entities.some(e => ['time', 'relative_date', 'day_of_week'].includes(e.type));
  const hasParticipants = entities.some(e => e.type === 'participants');
  const hasDuration = entities.some(e => e.type === 'duration');

  if (intent === 'schedule_meeting') {
    if (!hasTime) {
      clarifications.push({
        question: 'What date and time would you like to schedule this meeting?',
        type: 'missing_info',
        required: true,
        context: 'meeting_datetime'
      });
    }

    if (!hasParticipants) {
      clarifications.push({
        question: 'Who should be invited to this meeting?',
        type: 'missing_info',
        required: true,
        context: 'meeting_participants'
      });
    }

    if (!hasDuration) {
      clarifications.push({
        question: 'How long should this meeting be?',
        type: 'missing_info',
        options: ['30 minutes', '1 hour', '1.5 hours', '2 hours'],
        default_value: '1 hour',
        required: false,
        context: 'meeting_duration'
      });
    }
  }

  if (intent === 'check_availability' && !hasParticipants) {
    clarifications.push({
      question: 'Whose availability should I check?',
      type: 'missing_info',
      required: true,
      context: 'availability_participants'
    });
  }

  if (intent === 'reschedule_meeting') {
    const hasMeetingReference = entities.some(e => ['meeting_type', 'relative_date'].includes(e.type));
    if (!hasMeetingReference) {
      clarifications.push({
        question: 'Which meeting would you like to reschedule?',
        type: 'missing_info',
        required: true,
        context: 'meeting_identification'
      });
    }
  }

  return clarifications;
}

function generateResponse(
  intent: SchedulingIntent,
  entities: any[],
  actions: SchedulingAction[],
  suggestions: Suggestion[]
): string {
  const responses: Record<SchedulingIntent, string> = {
    schedule_meeting: 'I\'ll help you schedule that meeting. Let me gather the necessary details.',
    reschedule_meeting: 'I can reschedule that meeting for you. Let me find the best alternative time.',
    cancel_meeting: 'I\'ll cancel that meeting and notify the participants.',
    check_availability: 'Let me check the availability for those participants.',
    find_time_slot: 'I\'ll find the best available time slot based on everyone\'s schedules.',
    book_resource: 'I\'ll help you book the required resources for your meeting.',
    set_recurring_meeting: 'I can set up a recurring meeting series for you.',
    add_participants: 'I\'ll add those participants to the meeting.',
    change_duration: 'I can adjust the meeting duration as requested.',
    suggest_alternatives: 'Let me suggest some alternative options for you.',
    block_calendar: 'I\'ll block your calendar for the specified time.',
    create_event_series: 'I can create an event series with multiple sessions.'
  };

  let response = responses[intent] || 'I understand you want to manage your schedule. How can I help?';

  // Add specific information if available
  const meetingType = entities.find(e => e.type === 'meeting_type');
  const participants = entities.find(e => e.type === 'participants');
  const time = entities.find(e => ['time', 'relative_date', 'day_of_week'].includes(e.type));

  if (meetingType) {
    response += ` I see this is a ${meetingType.value} meeting.`;
  }

  if (participants) {
    response += ` I'll include ${participants.value} in the meeting.`;
  }

  if (time) {
    response += ` The timing looks like ${time.value}.`;
  }

  if (suggestions.length > 0) {
    response += ' I also have some suggestions to optimize your scheduling.';
  }

  return response;
}

// Helper functions to extract specific entities
function extractMeetingTitle(entities: any[]): string {
  const meetingType = entities.find(e => e.type === 'meeting_type');
  if (meetingType) {
    return `${meetingType.value.charAt(0).toUpperCase() + meetingType.value.slice(1)} Meeting`;
  }
  return 'Team Meeting';
}

function extractParticipants(entities: any[]): string[] {
  const participantEntity = entities.find(e => e.type === 'participants');
  if (participantEntity) {
    return participantEntity.value.split(/[,&]/).map((p: string) => p.trim());
  }
  return [];
}

function extractDateTime(entities: any[]): string {
  const timeEntity = entities.find(e => ['time', 'relative_date', 'day_of_week'].includes(e.type));
  if (timeEntity) {
    // Simple date parsing - in production would use a proper date parser
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM
    return tomorrow.toISOString();
  }
  
  // Default to tomorrow at 2 PM
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(14, 0, 0, 0);
  return defaultDate.toISOString();
}

function extractDuration(entities: any[]): number | null {
  const durationEntity = entities.find(e => e.type === 'duration');
  if (durationEntity) {
    const match = durationEntity.value.match(/\d+/);
    if (match) {
      const num = parseInt(match[0]);
      // Convert to minutes
      if (durationEntity.value.includes('hour') || durationEntity.value.includes('hr')) {
        return num * 60;
      }
      return num; // Assume minutes
    }
  }
  return null;
}

function extractLocation(entities: any[]): string | null {
  const locationEntity = entities.find(e => e.type === 'location');
  return locationEntity ? locationEntity.value : null;
}

function extractTimeFrame(entities: any[]): string {
  const timeEntity = entities.find(e => e.type === 'relative_period');
  return timeEntity ? timeEntity.value : 'this_week';
}

function extractMeetingReference(entities: any[]): string {
  const meetingType = entities.find(e => e.type === 'meeting_type');
  const time = entities.find(e => ['relative_date', 'day_of_week'].includes(e.type));
  
  if (meetingType && time) {
    return `${meetingType.value}_${time.value}`;
  }
  return 'next_meeting';
}

function extractConstraints(entities: any[]): any[] {
  // Extract scheduling constraints from entities
  return [];
}