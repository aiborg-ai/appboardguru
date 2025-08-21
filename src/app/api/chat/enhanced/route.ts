import { NextRequest, NextResponse } from 'next/server'
import { searchService } from '@/lib/services/search.service'
import { EnhancedChatResponse, AssetReference, WebReference, VaultReference, MeetingReference, ReportReference } from '@/types/search'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface EnhancedChatRequest {
  message: string
  context: {
    scope: 'general' | 'boardguru' | 'organization' | 'vault' | 'asset'
    organizationId?: string
    organizationName?: string
    vaultId?: string
    vaultName?: string
    assetId?: string
    assetName?: string
  }
  options?: {
    includeWebSearch?: boolean
    includeReferences?: boolean
    maxReferences?: number
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body: EnhancedChatRequest = await request.json()
    const { message, context, options = {} } = body
    const { 
      includeWebSearch = false, 
      includeReferences = true,
      maxReferences = 5 
    } = options

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

    // Get user info
    const { data: { user } } = await supabase.auth.getUser()

    let references: EnhancedChatResponse['references'] = {
      assets: [],
      websites: [],
      vaults: [],
      meetings: [],
      reports: []
    }

    let searchMetadata = {
      query_processed: message,
      search_time_ms: 0,
      total_results_found: 0,
      context_used: context.scope
    }

    // Perform search if references are requested
    if (includeReferences) {
      const searchStartTime = Date.now()
      
      try {
        const searchRequest = {
          query: message,
          context_scope: context.scope,
          context_id: context.organizationId || context.vaultId || context.assetId,
          limit: maxReferences * 2, // Get more results for better filtering
          search_type: 'hybrid' as const
        }

        const searchResponse = await searchService.search(searchRequest)
        const searchTime = Date.now() - searchStartTime

        searchMetadata = {
          query_processed: message,
          search_time_ms: searchTime,
          total_results_found: searchResponse.total_count,
          context_used: context.scope
        }

        // Transform search results to references
        references.assets = searchResponse.results
          .slice(0, maxReferences)
          .map(result => transformToAssetReference(result))

        // Search for related vaults (if not in vault scope)
        if (context.scope !== 'vault' && context.organizationId) {
          references.vaults = await searchVaults(supabase, message, context.organizationId, Math.ceil(maxReferences / 2))
        }

        // Search for related meetings
        if (context.organizationId) {
          references.meetings = await searchMeetings(supabase, message, context.organizationId, Math.ceil(maxReferences / 3))
        }

        // Track the search query
        if (user?.id) {
          await searchService.trackSearchQuery(
            message,
            context.scope,
            context.organizationId || context.vaultId || context.assetId,
            user.id,
            context.organizationId,
            searchResponse.total_count,
            searchTime
          )
        }

      } catch (searchError) {
        console.error('Search error:', searchError)
        // Continue without search results
      }
    }

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(context, references)
    
    // Prepare messages for OpenRouter
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'BoardGuru AI Assistant'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        stream: false
      })
    })

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`)
    }

    const aiResponse = await openRouterResponse.json()
    const aiMessage = aiResponse.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Generate suggestions based on context
    const suggestions = generateSuggestions(message, context.scope)

    const totalTime = Date.now() - startTime

    const response: EnhancedChatResponse = {
      success: true,
      message: aiMessage,
      references: includeReferences ? references : undefined,
      suggestions,
      search_metadata: includeReferences ? searchMetadata : undefined,
      usage: {
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Enhanced chat error:', error)
    
    const errorResponse: EnhancedChatResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      search_metadata: {
        query_processed: '',
        search_time_ms: Date.now() - startTime,
        total_results_found: 0,
        context_used: 'general'
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

function buildSystemPrompt(
  context: EnhancedChatRequest['context'], 
  references: EnhancedChatResponse['references']
): string {
  let prompt = `You are BoardGuru AI Assistant, an intelligent assistant specialized in corporate governance, board management, and document analysis.

Current Context: ${context.scope}`

  if (context.organizationName) {
    prompt += `\nOrganization: ${context.organizationName}`
  }
  if (context.vaultName) {
    prompt += `\nVault: ${context.vaultName}`
  }
  if (context.assetName) {
    prompt += `\nAsset: ${context.assetName}`
  }

  prompt += `

Available References:
`

  if (references?.assets && references.assets.length > 0) {
    prompt += `\nDocuments & Assets:\n`
    references.assets.forEach((asset, index) => {
      prompt += `${index + 1}. "${asset.title}" - ${asset.description || 'No description'} (${asset.metadata.category})\n`
    })
  }

  if (references?.vaults && references.vaults.length > 0) {
    prompt += `\nVaults:\n`
    references.vaults.forEach((vault, index) => {
      prompt += `${index + 1}. "${vault.name}" - ${vault.description || 'No description'} (${vault.asset_count} assets)\n`
    })
  }

  if (references?.meetings && references.meetings.length > 0) {
    prompt += `\nMeetings:\n`
    references.meetings.forEach((meeting, index) => {
      prompt += `${index + 1}. "${meeting.title}" - ${meeting.description || 'No description'} (${meeting.meeting_type})\n`
    })
  }

  prompt += `

Instructions:
1. Provide helpful, accurate responses based on the user's question and the available context
2. When referencing documents, vaults, or meetings from the available references, use this format: [Reference Name](ref:type:id)
   - For assets: [Document Title](ref:asset:asset-id)
   - For vaults: [Vault Name](ref:vault:vault-id)  
   - For meetings: [Meeting Title](ref:meeting:meeting-id)
3. Be specific and actionable in your responses
4. If you don't have enough context to answer completely, acknowledge this and suggest what additional information might be helpful
5. Focus on corporate governance, compliance, board management, and document-related topics
6. Use professional language appropriate for executive and board-level audiences

Remember: Always cite your sources using the reference format when mentioning specific documents, vaults, or meetings.`

  return prompt
}

function transformToAssetReference(searchResult: any): AssetReference {
  return {
    id: searchResult.asset.id,
    type: getAssetType(searchResult.asset.file_type),
    title: searchResult.asset.title,
    description: searchResult.asset.description,
    excerpt: searchResult.metadata.ai_summary,
    url: `/dashboard/assets/${searchResult.asset.id}`,
    download_url: `/api/assets/${searchResult.asset.id}/download`,
    thumbnail_url: searchResult.asset.thumbnail_url,
    relevance_score: searchResult.metadata.relevance_score,
    confidence_score: Math.min(searchResult.metadata.relevance_score * 0.1, 1.0),
    metadata: {
      fileName: searchResult.asset.file_name,
      fileSize: searchResult.asset.file_size,
      fileType: searchResult.asset.file_type,
      lastModified: searchResult.asset.updated_at,
      vault: searchResult.vault,
      organization: searchResult.organization,
      tags: searchResult.asset.tags || [],
      category: searchResult.asset.category,
      estimatedReadTime: searchResult.metadata.estimated_read_time,
      complexityLevel: searchResult.metadata.complexity_level
    },
    preview: {
      content: searchResult.highlight?.content,
      wordCount: searchResult.metadata.ai_summary?.length || 0
    }
  }
}

function getAssetType(fileType: string): AssetReference['type'] {
  const lowerType = fileType.toLowerCase()
  if (lowerType.includes('pdf')) return 'pdf'
  if (lowerType.includes('doc') || lowerType.includes('text')) return 'text'
  if (lowerType.includes('xls') || lowerType.includes('csv')) return 'spreadsheet'
  if (lowerType.includes('ppt')) return 'presentation'
  if (lowerType.includes('image') || lowerType.includes('png') || lowerType.includes('jpg')) return 'image'
  return 'document'
}

async function searchVaults(
  supabase: any, 
  query: string, 
  organizationId: string, 
  limit: number
): Promise<VaultReference[]> {
  try {
    const { data } = await supabase
      .from('vaults')
      .select(`
        id,
        name,
        description,
        created_at,
        vault_assets(count),
        vault_members(count),
        organization:organizations(id, name)
      `)
      .eq('organization_id', organizationId)
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (!data) return []

    return data.map((vault: any) => ({
      id: vault.id,
      name: vault.name,
      description: vault.description,
      url: `/dashboard/vaults/${vault.id}`,
      asset_count: vault.vault_assets?.length || 0,
      member_count: vault.vault_members?.length || 0,
      last_activity: vault.created_at,
      organization: {
        id: vault.organization.id,
        name: vault.organization.name
      },
      relevance_score: 0.7,
      confidence_score: 0.8
    }))
  } catch (error) {
    console.error('Error searching vaults:', error)
    return []
  }
}

async function searchMeetings(
  supabase: any, 
  query: string, 
  organizationId: string, 
  limit: number
): Promise<MeetingReference[]> {
  try {
    const { data } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        description,
        meeting_date,
        meeting_type,
        status,
        agenda_items,
        organization:organizations(id, name)
      `)
      .eq('organization_id', organizationId)
      .ilike('title', `%${query}%`)
      .limit(limit)

    if (!data) return []

    return data.map((meeting: any) => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      url: `/dashboard/meetings/${meeting.id}`,
      meeting_date: meeting.meeting_date,
      meeting_type: meeting.meeting_type,
      status: meeting.status,
      agenda_items: meeting.agenda_items || [],
      organization: {
        id: meeting.organization.id,
        name: meeting.organization.name
      },
      relevance_score: 0.6,
      confidence_score: 0.7
    }))
  } catch (error) {
    console.error('Error searching meetings:', error)
    return []
  }
}

function generateSuggestions(query: string, scope: string): string[] {
  const suggestions: string[] = []
  
  if (query.length > 3) {
    suggestions.push(`Find documents related to ${query}`)
    
    if (scope === 'organization') {
      suggestions.push(`Show governance documents about ${query}`)
      suggestions.push(`Find board meetings discussing ${query}`)
    } else if (scope === 'vault') {
      suggestions.push(`Search vault contents for ${query}`)
      suggestions.push(`Show recent documents about ${query}`)
    }
    
    suggestions.push(`Generate report on ${query}`)
    suggestions.push(`What are the key insights about ${query}?`)
  }
  
  return suggestions.slice(0, 4)
}