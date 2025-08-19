import { NextRequest, NextResponse } from 'next/server'
import { chatWithOpenRouter } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context, conversationHistory } = body

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Send chat message to OpenRouter
    const chatResult = await chatWithOpenRouter({
      message,
      context,
      conversationHistory
    })

    if (!chatResult.success) {
      return NextResponse.json(
        { success: false, error: chatResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: chatResult.data?.message,
      usage: chatResult.data?.usage
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}