'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

interface ContextDetectionResult {
  currentContext: string | null
  contextEntities: string[]
  contextType: 'organization' | 'person' | 'project' | 'industry' | 'general' | null
  confidence: number
}

interface EntityExtractionResult {
  entities: string[]
  keywords: string[]
  organizationNames: string[]
  personNames: string[]
  locations: string[]
}

export function useContextDetection(): ContextDetectionResult & {
  updateContext: (content: string) => void
  clearContext: () => void
} {
  const pathname = usePathname()
  const [contextData, setContextData] = useState<ContextDetectionResult>({
    currentContext: null,
    contextEntities: [],
    contextType: null,
    confidence: 0
  })

  // Extract entities from text content using simple NLP patterns
  const extractEntities = useCallback((text: string): EntityExtractionResult => {
    const entities: string[] = []
    const keywords: string[] = []
    const organizationNames: string[] = []
    const personNames: string[] = []
    const locations: string[] = []

    // Common organization suffixes
    const orgSuffixes = ['Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Co', 'Group', 'Holdings', 'Technologies', 'Tech', 'Systems', 'Solutions', 'Services', 'Partners', 'Consulting', 'Capital', 'Ventures', 'Investments', 'Industries', 'International', 'Global', 'Enterprise', 'Enterprises']
    
    // Common person name patterns (simplified)
    const commonFirstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Jennifer', 'William', 'Mary', 'James', 'Patricia', 'Christopher', 'Susan', 'Daniel', 'Jessica', 'Matthew', 'Emily']
    
    // Split into words and analyze
    const words = text.split(/\s+/).filter(word => word.length > 2)
    const sentences = text.split(/[.!?]+/)

    // Look for organization names
    sentences.forEach(sentence => {
      orgSuffixes.forEach(suffix => {
        const regex = new RegExp(`([A-Z][a-zA-Z\\s]+)\\s+(${suffix})\\b`, 'g')
        const matches = sentence.match(regex)
        if (matches) {
          matches.forEach(match => {
            const orgName = match.trim()
            if (orgName && !organizationNames.includes(orgName)) {
              organizationNames.push(orgName)
              entities.push(orgName)
            }
          })
        }
      })
    })

    // Look for capitalized words that might be names or entities
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '')
      
      if (cleanWord.length > 3 && cleanWord[0] && cleanWord[0] === cleanWord[0].toUpperCase()) {
        if (!entities.includes(cleanWord) && !commonFirstNames.includes(cleanWord)) {
          entities.push(cleanWord)
        }
      }

      // Extract keywords (longer words that aren't proper nouns)
      if (cleanWord.length > 5 && cleanWord[0] && cleanWord[0] === cleanWord[0].toLowerCase()) {
        if (!keywords.includes(cleanWord.toLowerCase())) {
          keywords.push(cleanWord.toLowerCase())
        }
      }
    })

    return {
      entities: entities.slice(0, 10), // Limit to top 10
      keywords: keywords.slice(0, 15), // Limit to top 15
      organizationNames,
      personNames,
      locations
    }
  }, [])

  // Determine context type based on content and URL
  const determineContextType = useCallback((
    pathname: string, 
    entities: EntityExtractionResult
  ): { type: ContextDetectionResult['contextType'], confidence: number } => {
    // URL-based context detection
    if (pathname.includes('/organization') || pathname.includes('/company')) {
      return { type: 'organization', confidence: 0.8 }
    }
    if (pathname.includes('/project')) {
      return { type: 'project', confidence: 0.7 }
    }
    if (pathname.includes('/person') || pathname.includes('/profile')) {
      return { type: 'person', confidence: 0.7 }
    }

    // Content-based context detection
    if (entities.organizationNames.length > 0) {
      return { type: 'organization', confidence: 0.6 + (entities.organizationNames.length * 0.1) }
    }
    if (entities.personNames.length > 0) {
      return { type: 'person', confidence: 0.5 + (entities.personNames.length * 0.1) }
    }

    // Industry keywords
    const industryKeywords = ['finance', 'technology', 'healthcare', 'education', 'manufacturing', 'retail', 'consulting', 'energy', 'telecom']
    const hasIndustryKeywords = entities.keywords.some(keyword => 
      industryKeywords.some(industry => keyword.includes(industry))
    )
    
    if (hasIndustryKeywords) {
      return { type: 'industry', confidence: 0.4 }
    }

    return { type: 'general', confidence: 0.2 }
  }, [])

  // Update context based on content
  const updateContext = useCallback((content: string) => {
    if (!content || content.trim().length < 20) {
      return
    }

    const entities = extractEntities(content)
    const contextAnalysis = determineContextType(pathname, entities)
    
    // Determine primary context
    let primaryContext: string | null = null
    
    if (contextAnalysis.type === 'organization' && entities.organizationNames.length > 0) {
      primaryContext = entities.organizationNames[0] || null
    } else if (contextAnalysis.type === 'person' && entities.personNames.length > 0) {
      primaryContext = entities.personNames[0] || null
    } else if (entities.entities.length > 0) {
      primaryContext = entities.entities[0] || null
    }

    // Combine entities and keywords for context
    const allContextEntities = [
      ...entities.entities,
      ...entities.keywords.slice(0, 5),
      ...entities.organizationNames,
      ...entities.personNames
    ].filter((entity, index, self) => self.indexOf(entity) === index) // Remove duplicates

    setContextData({
      currentContext: primaryContext,
      contextEntities: allContextEntities.slice(0, 10), // Limit to 10 most relevant
      contextType: contextAnalysis.type,
      confidence: Math.min(contextAnalysis.confidence, 0.95)
    })
  }, [pathname, extractEntities, determineContextType])

  // Clear context
  const clearContext = useCallback(() => {
    setContextData({
      currentContext: null,
      contextEntities: [],
      contextType: null,
      confidence: 0
    })
  }, [])

  // Monitor DOM changes for content updates
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      let hasContentChange = false
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasContentChange = true
        }
        if (mutation.type === 'characterData') {
          hasContentChange = true
        }
      })

      if (hasContentChange) {
        // Debounce content analysis
        setTimeout(() => {
          const mainContent = document.querySelector('main') || document.body
          if (mainContent) {
            const textContent = mainContent.textContent || ''
            updateContext(textContent)
          }
        }, 1000) // 1 second debounce
      }
    })

    // Start observing
    const targetNode = document.querySelector('main') || document.body
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
        characterData: true
      })
    }

    // Initial context detection
    const initialContent = targetNode?.textContent || ''
    if (initialContent) {
      updateContext(initialContent)
    }

    return () => {
      observer.disconnect()
    }
  }, [updateContext])

  // Clear context when pathname changes
  useEffect(() => {
    clearContext()
  }, [pathname, clearContext])

  return {
    ...contextData,
    updateContext,
    clearContext
  }
}