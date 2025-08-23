/**
 * Semantic Search API Endpoint
 * Advanced document search with semantic understanding and discovery
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { semanticSearchService } from '@/lib/services/semantic-search.service'
import { z } from 'zod'

// Request validation schemas
const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  options: z.object({
    documentIds: z.array(z.string()).optional(),
    maxResults: z.number().min(1).max(100).optional(),
    includeSnippets: z.boolean().optional(),
    searchTypes: z.array(z.enum(['semantic', 'keyword', 'fuzzy', 'phrase', 'concept', 'neural'])).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'range', 'in', 'not_in', 'exists']),
      value: z.any(),
      boost: z.number().optional()
    })).optional(),
    sorting: z.object({
      field: z.enum(['relevance', 'date', 'title', 'size', 'priority']),
      direction: z.enum(['asc', 'desc']),
      secondarySort: z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc'])
      }).optional()
    }).optional(),
    clustering: z.object({
      enabled: z.boolean(),
      algorithm: z.enum(['kmeans', 'hierarchical', 'dbscan']).optional(),
      maxClusters: z.number().min(2).max(20).optional(),
      minClusterSize: z.number().min(1).optional(),
      similarityThreshold: z.number().min(0).max(1).optional()
    }).optional(),
    semanticBoost: z.number().min(0).max(2).optional(),
    fuzzySearch: z.boolean().optional(),
    synonymExpansion: z.boolean().optional(),
    contextWindow: z.number().min(3).max(50).optional()
  }).optional()
})

const IndexRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required')
})

const ClusteringRequestSchema = z.object({
  documentIds: z.array(z.string()).optional(),
  options: z.object({
    algorithm: z.enum(['kmeans', 'hierarchical', 'dbscan']).optional(),
    maxClusters: z.number().min(2).max(50).optional(),
    minClusterSize: z.number().min(1).optional()
  }).optional()
})

const RelationshipRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required')
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation') || 'search'

    switch (operation) {
      case 'search': {
        // Semantic search operation
        const validatedData = SearchRequestSchema.parse(body)
        
        const result = await semanticSearchService.performSemanticSearch({
          query: validatedData.query,
          options: validatedData.options || {}
        })

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Search failed'
          }, { status: 500 })
        }

        // Log search activity
        await supabase.from('search_logs').insert({
          user_id: user.id,
          query: validatedData.query,
          results_count: result.data.results.length,
          search_time_ms: result.data.searchTime,
          search_strategy: result.data.searchStrategy.primary,
          filters_applied: validatedData.options?.filters?.length || 0,
          clustering_enabled: validatedData.options?.clustering?.enabled || false
        })

        // Store popular queries for analytics
        await supabase.from('popular_queries').upsert({
          query_text: validatedData.query.toLowerCase(),
          search_count: 1,
          last_searched: new Date().toISOString()
        }, {
          onConflict: 'query_text',
          ignoreDuplicates: false
        })

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'index': {
        // Document indexing operation
        const validatedData = IndexRequestSchema.parse(body)
        
        const result = await semanticSearchService.indexDocument(validatedData.documentId)

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Indexing failed'
          }, { status: 500 })
        }

        // Update document metadata
        await supabase
          .from('board_packs')
          .update({ 
            indexed_at: new Date().toISOString(),
            search_indexed: true
          })
          .eq('id', validatedData.documentId)

        // Log indexing activity
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          event_type: 'document_intelligence',
          event_category: 'document_indexing',
          action: 'index',
          resource_type: 'document',
          resource_id: validatedData.documentId,
          event_description: `Indexed document for semantic search`,
          outcome: 'success'
        })

        return NextResponse.json({
          success: true,
          message: 'Document indexed successfully'
        })
      }

      case 'reindex': {
        // Batch reindexing operation
        const { documentIds } = body
        
        const result = await semanticSearchService.reindexDocuments(documentIds)

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Reindexing failed'
          }, { status: 500 })
        }

        // Update document metadata for successfully indexed documents
        if (result.data.indexed > 0) {
          const indexedIds = documentIds.filter((id: string) => 
            !result.data.failed.includes(id)
          )
          
          if (indexedIds.length > 0) {
            await supabase
              .from('board_packs')
              .update({ 
                indexed_at: new Date().toISOString(),
                search_indexed: true
              })
              .in('id', indexedIds)
          }
        }

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'cluster': {
        // Document clustering operation
        const validatedData = ClusteringRequestSchema.parse(body)
        
        const result = await semanticSearchService.clusterDocuments(
          validatedData.documentIds,
          validatedData.options
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Clustering failed'
          }, { status: 500 })
        }

        // Store clustering results
        const { data: clusteringRecord, error: storeError } = await supabase
          .from('document_clusters')
          .insert({
            user_id: user.id,
            document_ids: validatedData.documentIds,
            algorithm: validatedData.options?.algorithm || 'kmeans',
            clusters: result.data.map(cluster => ({
              id: cluster.id,
              name: cluster.name,
              description: cluster.description,
              document_count: cluster.documents.length,
              coherence: cluster.coherenceScore,
              topics: cluster.topics
            }))
          })
          .select()
          .single()

        if (storeError) {
          console.error('Failed to store clustering results:', storeError)
        }

        return NextResponse.json({
          success: true,
          data: {
            clusters: result.data,
            clusteringId: clusteringRecord?.id
          }
        })
      }

      case 'relationships': {
        // Document relationship discovery
        const validatedData = RelationshipRequestSchema.parse(body)
        
        const result = await semanticSearchService.discoverDocumentRelationships(
          validatedData.documentId
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Relationship discovery failed'
          }, { status: 500 })
        }

        // Store relationship data
        const relationships = result.data.map(rel => ({
          source_document_id: rel.sourceDocumentId,
          target_document_id: rel.targetDocumentId,
          relationship_type: rel.relationshipType,
          strength: rel.strength,
          description: rel.description,
          discovered_by: user.id
        }))

        if (relationships.length > 0) {
          await supabase
            .from('document_relationships')
            .upsert(relationships, {
              onConflict: 'source_document_id,target_document_id',
              ignoreDuplicates: false
            })
        }

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'knowledge-graph': {
        // Knowledge graph construction
        const { documentIds } = body
        
        const result = await semanticSearchService.buildKnowledgeGraph(documentIds)

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Knowledge graph construction failed'
          }, { status: 500 })
        }

        // Store knowledge graph
        const { data: graphRecord, error: storeError } = await supabase
          .from('knowledge_graphs')
          .insert({
            user_id: user.id,
            document_ids: documentIds,
            nodes: result.data.nodes,
            edges: result.data.edges,
            communities: result.data.communities,
            centrality_scores: result.data.centralityScores,
            clustering_coefficient: result.data.clusteringCoefficient
          })
          .select()
          .single()

        if (storeError) {
          console.error('Failed to store knowledge graph:', storeError)
        }

        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            graphId: graphRecord?.id
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Search API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation') || 'history'
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (operation) {
      case 'history': {
        // Get search history
        const { data: searchHistory, error } = await supabase
          .from('search_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve search history'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            searches: searchHistory,
            totalCount: searchHistory.length
          }
        })
      }

      case 'popular-queries': {
        // Get popular search queries
        const { data: popularQueries, error } = await supabase
          .from('popular_queries')
          .select('*')
          .order('search_count', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve popular queries'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            queries: popularQueries,
            totalCount: popularQueries.length
          }
        })
      }

      case 'clusters': {
        // Get clustering results
        const { data: clusters, error } = await supabase
          .from('document_clusters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve clusters'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            clusters,
            totalCount: clusters.length
          }
        })
      }

      case 'relationships': {
        // Get document relationships
        const documentId = searchParams.get('documentId')
        
        let query = supabase
          .from('document_relationships')
          .select('*')
          .order('strength', { ascending: false })
          .limit(limit)

        if (documentId) {
          query = query.or(`source_document_id.eq.${documentId},target_document_id.eq.${documentId}`)
        }

        const { data: relationships, error } = await query

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve relationships'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            relationships,
            totalCount: relationships.length
          }
        })
      }

      case 'knowledge-graphs': {
        // Get knowledge graphs
        const { data: graphs, error } = await supabase
          .from('knowledge_graphs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve knowledge graphs'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            graphs,
            totalCount: graphs.length
          }
        })
      }

      case 'suggestions': {
        // Get search suggestions based on query
        const query = searchParams.get('query')
        
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query parameter is required for suggestions'
          }, { status: 400 })
        }

        // Get suggestions from popular queries
        const { data: suggestions, error } = await supabase
          .from('popular_queries')
          .select('query_text, search_count')
          .ilike('query_text', `%${query.toLowerCase()}%`)
          .order('search_count', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve suggestions'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            suggestions: suggestions.map(s => s.query_text)
          }
        })
      }

      case 'index-status': {
        // Get indexing status for documents
        const { data: documents, error } = await supabase
          .from('board_packs')
          .select('id, title, search_indexed, indexed_at')
          .order('indexed_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve index status'
          }, { status: 500 })
        }

        const indexedCount = documents.filter(d => d.search_indexed).length
        const totalCount = documents.length

        return NextResponse.json({
          success: true,
          data: {
            documents,
            summary: {
              totalDocuments: totalCount,
              indexedDocuments: indexedCount,
              indexingProgress: totalCount > 0 ? (indexedCount / totalCount) * 100 : 0
            }
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Get search data API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}