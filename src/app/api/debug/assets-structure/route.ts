import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get columns info using raw SQL
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { 
        table_name: 'assets' 
      })
      .select()

    // Try a simpler query if the RPC doesn't exist
    let tableInfo = null
    if (columnsError) {
      console.log('RPC not available, trying direct query')
      // Try to get basic info
      const { data: testData, error: testError } = await supabase
        .from('assets')
        .select('*')
        .limit(0)
      
      if (!testError) {
        tableInfo = {
          message: 'Table exists and is accessible',
          canQuery: true
        }
      } else {
        tableInfo = {
          message: 'Table access error',
          error: testError.message,
          canQuery: false
        }
      }
    }

    // Test if we can insert (dry run - rollback)
    const testData = {
      file_name: 'test.pdf',
      file_path: '/test/path',
      file_size: 1000,
      file_type: 'application/pdf',
      user_id: user.id,
      owner_id: user.id,
      uploaded_by: user.id,
      organization_id: null,
      title: 'Test Asset',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('assets')
      .insert(testData)
      .select()
      .single()

    // If insert worked, delete it immediately
    if (insertTest && !insertError) {
      await supabase
        .from('assets')
        .delete()
        .eq('id', insertTest.id)
    }

    return NextResponse.json({
      success: true,
      tableInfo: tableInfo || { columns },
      insertTest: {
        success: !insertError,
        error: insertError?.message,
        errorCode: insertError?.code,
        errorHint: insertError?.hint,
        testDataUsed: {
          ...testData,
          user_id: 'set',
          owner_id: 'set',
          uploaded_by: 'set'
        }
      },
      userId: user.id,
      email: user.email
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}