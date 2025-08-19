import { NextRequest, NextResponse } from 'next/server';
import { summarizeDocument, generateAudioScript } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      content, 
      fileName, 
      includeKeyPoints = true, 
      includeActionItems = true, 
      maxLength = 'medium',
      generateAudio = false 
    } = body;

    // Validate required fields
    if (!content || !fileName) {
      return NextResponse.json(
        { error: 'Content and fileName are required' },
        { status: 400 }
      );
    }

    // Validate content length (prevent extremely large documents)
    if (content.length > 100000) {
      return NextResponse.json(
        { error: 'Document content too large. Maximum 100,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Generate document summary using Claude
    const summaryResult = await summarizeDocument({
      content,
      fileName,
      includeKeyPoints,
      includeActionItems,
      maxLength,
    });

    if (!summaryResult.success) {
      return NextResponse.json(
        { error: summaryResult.error || 'Failed to generate summary' },
        { status: 500 }
      );
    }

    let audioScript = null;
    if (generateAudio && summaryResult.summary) {
      const audioResult = await generateAudioScript(summaryResult.summary);
      if (audioResult.success) {
        audioScript = audioResult.script;
      } else {
        console.warn('Failed to generate audio script:', audioResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      summary: summaryResult.summary,
      audioScript,
      usage: summaryResult.usage,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in summarize-document API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}