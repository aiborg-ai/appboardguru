import { NextRequest, NextResponse } from 'next/server';
import { chatWithClaude } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      context, 
      conversationHistory = [],
      sessionId 
    } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 5,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Validate conversation history format
    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Conversation history must be an array' },
        { status: 400 }
      );
    }

    // Limit conversation history to prevent token overflow
    const limitedHistory = conversationHistory.slice(-10); // Keep last 10 exchanges

    // Generate response using Claude
    const chatResult = await chatWithClaude({
      message,
      context,
      conversationHistory: limitedHistory,
    });

    if (!chatResult.success) {
      return NextResponse.json(
        { error: chatResult.error || 'Failed to generate response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: chatResult.message,
      usage: chatResult.usage,
      sessionId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in chat API:', error);
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