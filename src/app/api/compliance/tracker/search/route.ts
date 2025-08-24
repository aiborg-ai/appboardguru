/**
 * Compliance Search API
 * Advanced search and filtering across all compliance data
 */

import { NextRequest, NextResponse } from 'next/server'
import { ComplianceRepository } from '@/lib/repositories/compliance.repository.enhanced'
import { ComplianceSearchFilters } from '@/types/compliance'

const complianceRepo = new ComplianceRepository()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const query = searchParams.get('q') || ''
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Parse filters from search params
    const filters: ComplianceSearchFilters = {}
    
    if (searchParams.get('frameworks')) {
      filters.frameworks = searchParams.get('frameworks')!.split(',')
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as any
    }
    if (searchParams.get('priority')) {
      filters.priority = searchParams.get('priority')!.split(',') as any
    }
    if (searchParams.get('assignedTo')) {
      filters.assignedTo = searchParams.get('assignedTo')!.split(',')
    }
    if (searchParams.get('categories')) {
      filters.categories = searchParams.get('categories')!.split(',')
    }
    if (searchParams.get('assessmentTypes')) {
      filters.assessmentTypes = searchParams.get('assessmentTypes')!.split(',') as any
    }
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filters.dateRange = {
        start: searchParams.get('startDate')!,
        end: searchParams.get('endDate')!
      }
    }

    // Perform searches across different entity types
    const [assessments, findings, policies] = await Promise.all([
      complianceRepo.getAssessments(organizationId, filters),
      complianceRepo.getFindings(organizationId, filters),
      complianceRepo.getPolicies(organizationId)
    ])

    // Filter results based on search query if provided
    let filteredResults = {
      assessments,
      findings,
      policies: policies.filter(p => 
        !query || 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      )
    }

    if (query) {
      const queryLower = query.toLowerCase()
      
      filteredResults.assessments = assessments.filter(a =>
        a.name.toLowerCase().includes(queryLower) ||
        a.scope.some(s => s.toLowerCase().includes(queryLower))
      )

      filteredResults.findings = findings.filter(f =>
        f.title.toLowerCase().includes(queryLower) ||
        f.description.toLowerCase().includes(queryLower) ||
        f.deficiencies.some(d => d.toLowerCase().includes(queryLower))
      )
    }

    const totalResults = 
      filteredResults.assessments.length + 
      filteredResults.findings.length + 
      filteredResults.policies.length

    return NextResponse.json({
      success: true,
      message: 'Search completed successfully',
      data: {
        results: filteredResults,
        totalResults,
        query,
        filters,
        facets: {
          frameworks: [...new Set(assessments.map(a => a.frameworkId))],
          statuses: [...new Set([
            ...assessments.map(a => a.status),
            ...findings.map(f => f.status)
          ])],
          priorities: [...new Set(findings.map(f => f.severity))],
          categories: [...new Set(policies.map(p => p.category))]
        }
      }
    })

  } catch (error) {
    console.error('Compliance search error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to search compliance data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}