import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, company, position, message } = body

    // Validate required fields
    if (!fullName || !email || !company || !position) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // For testing - just log the email instead of sending
    console.log('📧 EMAIL NOTIFICATION WOULD BE SENT:')
    console.log('To:', process.env.ADMIN_EMAIL || 'hirendra.vikram@boardguru.ai')
    console.log('Subject: New BoardGuru Registration Request -', fullName)
    console.log('Registration Details:')
    console.log('- Name:', fullName)
    console.log('- Email:', email)
    console.log('- Company:', company)
    console.log('- Position:', position)
    console.log('- Message:', message || 'None')
    console.log('---')

    console.log('📧 USER CONFIRMATION WOULD BE SENT:')
    console.log('To:', email)
    console.log('Subject: BoardGuru Registration Request Received')
    console.log('Message: Thank you for your registration request!')

    return NextResponse.json({ 
      success: true, 
      message: 'Registration request submitted successfully (test mode)' 
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to process registration' },
      { status: 500 }
    )
  }
}