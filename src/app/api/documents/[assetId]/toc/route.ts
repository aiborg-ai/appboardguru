import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient() as any

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await supabase
      .from('vault_assets')
      .select('*, vaults!inner(created_by)')
      .eq('asset_id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vaults?.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if TOC already exists
    const { data: existingToc, error: tocError } = await supabase
      .from('document_table_of_contents')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (tocError) {
      console.error('Error fetching existing TOC:', tocError)
    }

    // If TOC exists and is recent (less than 24 hours), return it
    if (existingToc && existingToc.length > 0) {
      const toc = existingToc[0]
      const createdAt = new Date((toc as any)?.created_at || '')
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        return NextResponse.json((toc as any)?.content)
      }
    }

    // Generate new TOC using AI
    const generatedToc = await generateTableOfContents(asset)

    // Save generated TOC to database
    const tocData: Database['public']['Tables']['document_table_of_contents']['Insert'] = {
      asset_id: assetId,
      content: generatedToc,
      user_id: user.id
    }

    const { data: savedToc, error: saveError } = await supabase
      .from('document_table_of_contents')
      .insert(tocData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving TOC:', saveError)
      // Still return the generated TOC even if save fails
    }

    return NextResponse.json(generatedToc)

  } catch (error) {
    console.error('Error generating TOC:', error)
    return NextResponse.json(
      { error: 'Failed to generate table of contents' },
      { status: 500 }
    )
  }
}

async function generateTableOfContents(asset: any) {
  // This is a simplified TOC generation for demonstration
  // In a real implementation, you would:
  // 1. Extract text from the PDF/document
  // 2. Use an LLM to analyze the content and generate a proper TOC
  // 3. Parse the response into the required format

  const mockToc = [
    {
      id: '1',
      title: 'Executive Summary',
      page: 1,
      level: 0,
      children: []
    },
    {
      id: '2',
      title: 'Introduction',
      page: 2,
      level: 0,
      children: [
        {
          id: '2.1',
          title: 'Background',
          page: 2,
          level: 1,
          children: []
        },
        {
          id: '2.2',
          title: 'Objectives',
          page: 3,
          level: 1,
          children: []
        }
      ]
    },
    {
      id: '3',
      title: 'Methodology',
      page: 4,
      level: 0,
      children: [
        {
          id: '3.1',
          title: 'Data Collection',
          page: 4,
          level: 1,
          children: []
        },
        {
          id: '3.2',
          title: 'Analysis Approach',
          page: 5,
          level: 1,
          children: []
        }
      ]
    },
    {
      id: '4',
      title: 'Results',
      page: 6,
      level: 0,
      children: [
        {
          id: '4.1',
          title: 'Key Findings',
          page: 6,
          level: 1,
          children: []
        },
        {
          id: '4.2',
          title: 'Statistical Analysis',
          page: 8,
          level: 1,
          children: []
        }
      ]
    },
    {
      id: '5',
      title: 'Discussion',
      page: 10,
      level: 0,
      children: []
    },
    {
      id: '6',
      title: 'Conclusions',
      page: 12,
      level: 0,
      children: [
        {
          id: '6.1',
          title: 'Summary',
          page: 12,
          level: 1,
          children: []
        },
        {
          id: '6.2',
          title: 'Recommendations',
          page: 13,
          level: 1,
          children: []
        }
      ]
    },
    {
      id: '7',
      title: 'References',
      page: 14,
      level: 0,
      children: []
    },
    {
      id: '8',
      title: 'Appendices',
      page: 15,
      level: 0,
      children: [
        {
          id: '8.1',
          title: 'Appendix A: Data Tables',
          page: 15,
          level: 1,
          children: []
        },
        {
          id: '8.2',
          title: 'Appendix B: Additional Charts',
          page: 18,
          level: 1,
          children: []
        }
      ]
    }
  ]

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  return mockToc
}