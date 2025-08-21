import { NextRequest, NextResponse } from 'next/server';
import { VoiceController } from '../../../lib/api/controllers/voice.controller';

const controller = new VoiceController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'analytics':
      return controller.getAnalytics(request);
    case 'shortcuts':
      return controller.getShortcuts(request);
    case 'workflows':
      return controller.getWorkflows(request);
    case 'insights':
      return controller.getAssistantInsights(request);
    case 'collaboration':
      return controller.getCollaborationData(request);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: analytics, shortcuts, workflows, insights, collaboration' 
        },
        { status: 400 }
      );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'transcribe':
      return controller.transcribe(request);
    case 'translate':
      return controller.translate(request);
    case 'command':
      return controller.processCommand(request);
    case 'shortcut':
      return controller.createShortcut(request);
    case 'biometric':
      return controller.processBiometric(request);
    case 'workflow':
      return controller.createWorkflow(request);
    case 'training-start':
      return controller.startTrainingSession(request);
    case 'training-sample':
      return controller.submitTrainingSample(request);
    case 'training-complete':
      return controller.completeTrainingSession(request);
    case 'assistant':
      return controller.processAssistantRequest(request);
    case 'schedule':
      return controller.processSchedulingRequest(request);
    case 'annotation':
      return controller.createAnnotation(request);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: transcribe, translate, command, shortcut, biometric, workflow, training-start, training-sample, training-complete, assistant, schedule, annotation' 
        },
        { status: 400 }
      );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}