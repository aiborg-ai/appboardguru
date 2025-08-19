import { NextRequest, NextResponse } from 'next/server'
import { summarizeDocument, generateAudioScript } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, fileName, includeKeyPoints, includeActionItems, maxLength } = body

    // Validate required fields
    if (!content || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Content and fileName are required' },
        { status: 400 }
      )
    }

    // Generate document summary
    const summaryResult = await summarizeDocument({
      content,
      fileName,
      includeKeyPoints,
      includeActionItems,
      maxLength
    })

    if (!summaryResult.success) {
      return NextResponse.json(
        { success: false, error: summaryResult.error },
        { status: 500 }
      )
    }

    // Generate audio script (optional)
    let audioScript = null
    if (summaryResult.data?.summary) {
      const audioResult = await generateAudioScript(summaryResult.data.summary)
      if (audioResult.success) {
        audioScript = audioResult.data?.script
      }
    }

    return NextResponse.json({
      success: true,
      summary: summaryResult.data?.summary,
      audioScript,
      usage: summaryResult.data?.usage
    })

  } catch (error) {
    console.error('Document summarization error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process document summarization' },
      { status: 500 }
    )
  }
}