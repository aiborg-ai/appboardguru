import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientSafe } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe()
    
    if (!supabase) {
      return NextResponse.json({ peers: getMockPeerOrganizations() })
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const groupId = searchParams.get('groupId') || 'default'
    
    // For now, return mock data
    // In production, this would query the peer_organizations table
    return NextResponse.json({
      peers: getMockPeerOrganizations(),
      groupInfo: {
        id: groupId,
        name: 'Default Peer Group',
        quality: 92,
        lastUpdated: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Peer organizations API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      peers: getMockPeerOrganizations()
    }, { status: 500 })
  }
}

function getMockPeerOrganizations() {
  return [
    {
      id: '1',
      name: 'Global Tech Corp',
      ticker: 'GTC',
      industry: 'Technology',
      subIndustry: 'Software',
      country: 'United States',
      marketCap: 125000000000,
      revenue: 45000000000,
      employees: 75000,
      relevanceScore: 95,
      dataQuality: 98,
      lastUpdate: new Date().toISOString(),
      isPrimary: true,
      isAspirational: false
    },
    {
      id: '2',
      name: 'Innovation Industries',
      ticker: 'INOV',
      industry: 'Technology',
      subIndustry: 'Hardware',
      country: 'United States',
      marketCap: 98000000000,
      revenue: 38000000000,
      employees: 62000,
      relevanceScore: 92,
      dataQuality: 96,
      lastUpdate: new Date().toISOString(),
      isPrimary: true,
      isAspirational: false
    },
    {
      id: '3',
      name: 'Digital Solutions Inc',
      ticker: 'DSI',
      industry: 'Technology',
      subIndustry: 'Cloud Services',
      country: 'United States',
      marketCap: 156000000000,
      revenue: 52000000000,
      employees: 89000,
      relevanceScore: 88,
      dataQuality: 94,
      lastUpdate: new Date().toISOString(),
      isPrimary: false,
      isAspirational: true
    },
    {
      id: '4',
      name: 'Enterprise Systems Ltd',
      ticker: 'ESL',
      industry: 'Technology',
      subIndustry: 'Enterprise Software',
      country: 'United Kingdom',
      marketCap: 87000000000,
      revenue: 32000000000,
      employees: 48000,
      relevanceScore: 85,
      dataQuality: 92,
      lastUpdate: new Date().toISOString(),
      isPrimary: true,
      isAspirational: false
    },
    {
      id: '5',
      name: 'Data Analytics Corp',
      ticker: 'DAC',
      industry: 'Technology',
      subIndustry: 'Analytics',
      country: 'United States',
      marketCap: 72000000000,
      revenue: 28000000000,
      employees: 35000,
      relevanceScore: 82,
      dataQuality: 90,
      lastUpdate: new Date().toISOString(),
      isPrimary: false,
      isAspirational: false
    }
  ]
}