import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 })
    }

    // Get dropdown options for the specified category
    const { data: options, error } = await supabase
      .from('dropdown_options')
      .select(`
        id,
        value,
        label,
        description,
        sort_order,
        metadata,
        dropdown_option_categories!inner(name)
      `)
      .eq('dropdown_option_categories.name', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: options || []
    })

  } catch (error) {
    console.error('Dropdown options API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get current user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'director'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { category, value, label, description, metadata, sort_order } = body

    // Get category ID
    const { data: categoryData, error: categoryError } = await supabase
      .from('dropdown_option_categories')
      .select('id')
      .eq('name', category)
      .single()

    if (categoryError || !categoryData) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Create new option
    const { data: option, error } = await supabase
      .from('dropdown_options')
      .insert({
        category_id: categoryData.id,
        value,
        label,
        description,
        metadata: metadata || {},
        sort_order: sort_order || 999,
        is_system: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create option' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: option }, { status: 201 })

  } catch (error) {
    console.error('Create dropdown option error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}