/**
 * Document Analysis API Endpoint
 * Automated document analysis for contracts, financial statements, and legal documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { automatedDocumentAnalysisService } from '@/lib/services/automated-document-analysis.service'
import { z } from 'zod'

// Request validation schemas
const AnalyzeRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  analysisTypes: z.array(z.enum(['contract', 'financial', 'legal', 'compliance', 'risk', 'policy'])).min(1),
  options: z.object({
    deepAnalysis: z.boolean().optional(),
    riskThreshold: z.enum(['low', 'medium', 'high']).optional(),
    complianceFrameworks: z.array(z.string()).optional(),
    customRules: z.array(z.object({
      id: z.string(),
      name: z.string(),
      category: z.enum(['contract', 'financial', 'legal', 'compliance', 'risk', 'policy']),
      pattern: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      action: z.enum(['flag', 'extract', 'validate', 'calculate']),
      description: z.string()
    })).optional(),
    includeRecommendations: z.boolean().optional(),
    compareWithStandards: z.boolean().optional()
  }).optional()
})

const BatchAnalyzeRequestSchema = z.object({
  documentIds: z.array(z.string()).min(1, 'At least one document ID is required'),
  analysisTypes: z.array(z.enum(['contract', 'financial', 'legal', 'compliance', 'risk', 'policy'])).min(1),
  options: z.object({
    deepAnalysis: z.boolean().optional(),
    riskThreshold: z.enum(['low', 'medium', 'high']).optional(),
    complianceFrameworks: z.array(z.string()).optional(),
    includeRecommendations: z.boolean().optional(),
    compareWithStandards: z.boolean().optional(),
    generateCrossAnalysis: z.boolean().optional()
  }).optional()
})

const ComplianceCheckSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  frameworks: z.array(z.string()).min(1, 'At least one compliance framework is required')
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
    const operation = searchParams.get('operation') || 'analyze'

    switch (operation) {
      case 'analyze': {
        // Single document analysis
        const validatedData = AnalyzeRequestSchema.parse(body)
        
        const result = await automatedDocumentAnalysisService.analyzeDocument({
          documentId: validatedData.documentId,
          analysisTypes: validatedData.analysisTypes,
          options: validatedData.options || {}
        })

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to analyze document'
          }, { status: 500 })
        }

        // Store analysis results
        const { data: analysisRecord, error: storeError } = await supabase
          .from('document_analyses')
          .insert({
            document_id: validatedData.documentId,
            user_id: user.id,
            analysis_types: validatedData.analysisTypes,
            results: result.data.results,
            confidence: result.data.confidence,
            cross_analysis_insights: result.data.crossAnalysisInsights,
            risk_assessment: result.data.riskAssessment,
            compliance_results: result.data.complianceResults
          })
          .select()
          .single()

        if (storeError) {
          console.error('Failed to store analysis results:', storeError)
        }

        // Log activity
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          event_type: 'document_intelligence',
          event_category: 'document_analysis',
          action: 'analyze',
          resource_type: 'document',
          resource_id: validatedData.documentId,
          event_description: `Performed ${validatedData.analysisTypes.join(', ')} analysis`,
          outcome: 'success',
          details: {
            analysis_types: validatedData.analysisTypes,
            confidence: result.data.confidence,
            analysis_id: analysisRecord?.id
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            analysisId: analysisRecord?.id
          }
        })
      }

      case 'batch': {
        // Batch document analysis
        const validatedData = BatchAnalyzeRequestSchema.parse(body)
        const results = []
        const errors = []

        for (const documentId of validatedData.documentIds) {
          try {
            const result = await automatedDocumentAnalysisService.analyzeDocument({
              documentId,
              analysisTypes: validatedData.analysisTypes,
              options: validatedData.options || {}
            })

            if (result.success) {
              // Store individual analysis
              const { data: analysisRecord } = await supabase
                .from('document_analyses')
                .insert({
                  document_id: documentId,
                  user_id: user.id,
                  analysis_types: validatedData.analysisTypes,
                  results: result.data.results,
                  confidence: result.data.confidence,
                  cross_analysis_insights: result.data.crossAnalysisInsights,
                  risk_assessment: result.data.riskAssessment
                })
                .select()
                .single()

              results.push({
                documentId,
                analysis: result.data,
                analysisId: analysisRecord?.id
              })
            } else {
              errors.push({
                documentId,
                error: result.error || 'Analysis failed'
              })
            }
          } catch (error) {
            errors.push({
              documentId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        // Generate cross-analysis insights if requested
        let crossAnalysisInsights = null
        if (validatedData.options?.generateCrossAnalysis && results.length > 1) {
          // This would involve comparing results across documents
          crossAnalysisInsights = await this.generateBatchCrossAnalysis(results)
        }

        // Log batch activity
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          event_type: 'document_intelligence',
          event_category: 'batch_analysis',
          action: 'analyze_batch',
          resource_type: 'document_batch',
          resource_id: validatedData.documentIds.join(','),
          event_description: `Performed batch analysis on ${validatedData.documentIds.length} documents`,
          outcome: errors.length === 0 ? 'success' : 'partial_success',
          details: {
            document_count: validatedData.documentIds.length,
            successful_analyses: results.length,
            failed_analyses: errors.length,
            analysis_types: validatedData.analysisTypes
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            results,
            errors,
            crossAnalysisInsights,
            summary: {
              totalDocuments: validatedData.documentIds.length,
              successfulAnalyses: results.length,
              failedAnalyses: errors.length,
              averageConfidence: results.length > 0 
                ? results.reduce((sum, r) => sum + r.analysis.confidence, 0) / results.length
                : 0
            }
          }
        })
      }

      case 'compliance': {
        // Compliance-specific analysis
        const validatedData = ComplianceCheckSchema.parse(body)
        
        // Get document metadata first
        const document = await this.getDocumentMetadata(validatedData.documentId)
        const content = await this.getDocumentContent(validatedData.documentId)
        
        const result = await automatedDocumentAnalysisService.performComplianceAnalysis(
          document,
          content,
          validatedData.frameworks
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to perform compliance analysis'
          }, { status: 500 })
        }

        // Store compliance results
        const { data: complianceRecord, error: storeError } = await supabase
          .from('document_compliance_checks')
          .insert({
            document_id: validatedData.documentId,
            user_id: user.id,
            frameworks: validatedData.frameworks,
            results: result.data
          })
          .select()
          .single()

        if (storeError) {
          console.error('Failed to store compliance results:', storeError)
        }

        return NextResponse.json({
          success: true,
          data: {
            complianceResults: result.data,
            complianceId: complianceRecord?.id
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
    console.error('Document analysis API error:', error)
    
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
    const documentId = searchParams.get('documentId')
    const analysisId = searchParams.get('analysisId')
    const operation = searchParams.get('operation') || 'history'
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (operation) {
      case 'history': {
        // Get analysis history
        let query = supabase
          .from('document_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (documentId) {
          query = query.eq('document_id', documentId)
        }

        const { data: analyses, error } = await query

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve analysis history'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            analyses,
            totalCount: analyses.length
          }
        })
      }

      case 'details': {
        // Get specific analysis details
        if (!analysisId) {
          return NextResponse.json({
            success: false,
            error: 'Analysis ID is required'
          }, { status: 400 })
        }

        const { data: analysis, error } = await supabase
          .from('document_analyses')
          .select('*')
          .eq('id', analysisId)
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve analysis details'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: analysis
        })
      }

      case 'compliance': {
        // Get compliance check history
        let query = supabase
          .from('document_compliance_checks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (documentId) {
          query = query.eq('document_id', documentId)
        }

        const { data: complianceChecks, error } = await query

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve compliance checks'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            complianceChecks,
            totalCount: complianceChecks.length
          }
        })
      }

      case 'frameworks': {
        // Get available compliance frameworks
        const frameworks = [
          { id: 'sox', name: 'Sarbanes-Oxley Act', category: 'financial' },
          { id: 'gdpr', name: 'General Data Protection Regulation', category: 'data_privacy' },
          { id: 'iso27001', name: 'ISO 27001', category: 'information_security' },
          { id: 'hipaa', name: 'Health Insurance Portability and Accountability Act', category: 'healthcare' },
          { id: 'pci_dss', name: 'Payment Card Industry Data Security Standard', category: 'financial' },
          { id: 'mifid_ii', name: 'Markets in Financial Instruments Directive II', category: 'financial' }
        ]

        return NextResponse.json({
          success: true,
          data: {
            frameworks
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
    console.error('Get analysis data API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper methods (would normally be in a separate utility class)
async function getDocumentMetadata(documentId: string) {
  // Mock implementation - would fetch from database
  return {
    id: documentId,
    filename: `document_${documentId}.pdf`,
    fileType: 'contract',
    fileSize: 1024 * 1024,
    totalPages: 25,
    uploadedAt: new Date().toISOString(),
    processed: true
  }
}

async function getDocumentContent(documentId: string): Promise<string> {
  // Mock implementation - would fetch actual document content
  return "Mock document content for analysis..."
}

async function generateBatchCrossAnalysis(results: any[]): Promise<any> {
  // Mock implementation - would perform cross-analysis
  return {
    commonRisks: [],
    inconsistencies: [],
    correlations: [],
    recommendations: []
  }
}