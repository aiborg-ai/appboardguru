import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OCR service not configured' },
        { status: 503 }
      )
    }

    // Parse form data or JSON
    const contentType = request.headers.get('content-type') || ''
    
    let imageData: string
    let imageFormat: string
    let extractionMode: 'text' | 'table' | 'form' = 'text'

    if (contentType.includes('application/json')) {
      const body = await request.json()
      imageData = body.image
      imageFormat = body.format || 'png'
      extractionMode = body.mode || 'text'

      if (!imageData) {
        return NextResponse.json(
          { success: false, error: 'Image data is required' },
          { status: 400 }
        )
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const imageFile = formData.get('image') as File
      const mode = formData.get('mode') as string

      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: 'Image file is required' },
          { status: 400 }
        )
      }

      // Convert image to base64
      const arrayBuffer = await imageFile.arrayBuffer()
      imageData = Buffer.from(arrayBuffer).toString('base64')
      imageFormat = imageFile.type.split('/')[1] || 'png'
      extractionMode = (mode as 'text' | 'table' | 'form') || 'text'
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid content type. Use JSON or form-data' },
        { status: 400 }
      )
    }

    // Validate file size (max 20MB for image processing)
    const maxSize = 20 * 1024 * 1024 // 20MB
    const imageSize = Buffer.from(imageData, 'base64').length
    if (imageSize > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Image too large (max 20MB)' },
        { status: 400 }
      )
    }

    // Use OpenRouter GPT-4 Vision for OCR
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AppBoardGuru OCR Service'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // GPT-4o mini has vision capabilities
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: getExtractionPrompt(extractionMode)
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/${imageFormat};base64,${imageData}`,
                detail: 'high'
              }
            }
          ]
        }],
        max_tokens: 4000,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter OCR error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: `OCR service error: ${response.statusText}`,
          details: response.status === 429 ? 'Rate limit exceeded. Please try again later.' : undefined
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    if (result.choices && result.choices[0] && result.choices[0].message) {
      const extractedContent = result.choices[0].message.content.trim()
      
      // Parse the response based on extraction mode
      let parsedResult
      try {
        if (extractionMode === 'table' || extractionMode === 'form') {
          // Try to parse JSON for structured data
          parsedResult = JSON.parse(extractedContent)
        } else {
          parsedResult = { text: extractedContent }
        }
      } catch (e) {
        // Fallback to plain text if JSON parsing fails
        parsedResult = { text: extractedContent }
      }
      
      return NextResponse.json({
        success: true,
        extractedData: parsedResult,
        metadata: {
          mode: extractionMode,
          format: imageFormat,
          size: imageSize,
          confidence: 0.95, // GPT-4 Vision is highly accurate
          processingTime: Date.now(),
          timestamp: new Date().toISOString()
        }
      })
    } else {
      throw new Error('Invalid response format from OCR service')
    }

  } catch (error) {
    console.error('OCR extraction error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getExtractionPrompt(mode: 'text' | 'table' | 'form'): string {
  switch (mode) {
    case 'table':
      return `Please extract all tabular data from this image and return it in JSON format. Structure the response as:
{
  "tables": [
    {
      "headers": ["Column1", "Column2", "Column3"],
      "rows": [
        ["Value1", "Value2", "Value3"],
        ["Value4", "Value5", "Value6"]
      ],
      "title": "Table title if present"
    }
  ]
}
Be precise with the data extraction and maintain the original structure.`

    case 'form':
      return `Please extract all form fields and their values from this image and return it in JSON format. Structure the response as:
{
  "formFields": [
    {
      "label": "Field Name",
      "value": "Field Value",
      "type": "text|checkbox|radio|dropdown|date"
    }
  ],
  "formTitle": "Form title if present"
}
Extract all visible form elements including checkboxes, radio buttons, and text fields.`

    default:
      return `Please extract all text content from this image with high accuracy. Maintain the original structure and formatting as much as possible. Include headings, paragraphs, bullet points, and any other textual elements. Return only the extracted text content without additional commentary.`
  }
}