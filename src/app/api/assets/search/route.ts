import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Get query parameters
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const organizationId = url.searchParams.get('organizationId')
    const vaultId = url.searchParams.get('vaultId')

    // Build the query
    let assetsQuery = supabase
      .from('assets')
      .select(`
        id,
        title,
        file_name,
        file_type,
        file_size,
        description,
        created_at,
        updated_at,
        vault:vaults(
          id,
          name,
          organization:organizations(id, name)
        )
      `)
      .limit(limit)
      .order('updated_at', { ascending: false })

    // Add search filter if query provided
    if (query.trim()) {
      assetsQuery = assetsQuery.or(`title.ilike.%${query}%,file_name.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Add organization filter if provided
    if (organizationId) {
      assetsQuery = assetsQuery.eq('vault.organization_id', organizationId)
    }

    // Add vault filter if provided
    if (vaultId) {
      assetsQuery = assetsQuery.eq('vault_id', vaultId)
    }

    const { data: assets, error } = await assetsQuery

    if (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    // Transform the data to match the expected Asset interface
    const transformedAssets = assets?.map((asset: any) => ({
      id: asset.id,
      title: asset.title,
      fileName: asset.file_name,
      fileType: asset.file_type,
      fileSize: asset.file_size,
      description: asset.description,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      vault: asset.vault ? {
        id: asset.vault.id,
        name: asset.vault.name,
        organization: asset.vault.organization ? {
          id: asset.vault.organization.id,
          name: asset.vault.organization.name
        } : null
      } : null
    })) || []

    return NextResponse.json({
      success: true,
      assets: transformedAssets,
      total: transformedAssets.length
    })

  } catch (error) {
    console.error('Assets search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}