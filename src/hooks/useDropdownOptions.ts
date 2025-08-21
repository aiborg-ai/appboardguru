'use client'

import { useState, useEffect } from 'react'

interface DropdownOption {
  id: string
  value: string
  label: string
  description?: string
  sort_order: number
  metadata?: any
}

export function useDropdownOptions(category: string) {
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/cms/dropdown-options?category=${category}`)
      const result = await response.json()
      
      if (response.ok) {
        setOptions(result.data || [])
      } else {
        setError(result.error || 'Failed to fetch options')
      }
    } catch (err) {
      console.error('Error fetching dropdown options:', err)
      setError('Failed to fetch options')
      // Fallback to static options for critical categories
      setOptions(getStaticOptions(category))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOptions()
  }, [category])

  return { options, loading, error, refetch: fetchOptions }
}

// Static fallback options
function getStaticOptions(category: string): DropdownOption[] {
  switch (category) {
    case 'industry':
      return [
        { id: '1', value: 'technology', label: 'Technology', sort_order: 1 },
        { id: '2', value: 'finance_and_banking', label: 'Finance & Banking', sort_order: 2 },
        { id: '3', value: 'healthcare_and_life_sciences', label: 'Healthcare & Life Sciences', sort_order: 3 },
        { id: '4', value: 'education', label: 'Education', sort_order: 4 },
        { id: '5', value: 'manufacturing', label: 'Manufacturing', sort_order: 5 },
        { id: '6', value: 'retail_and_ecommerce', label: 'Retail & E-commerce', sort_order: 6 },
        { id: '7', value: 'real_estate', label: 'Real Estate', sort_order: 7 },
        { id: '8', value: 'legal_services', label: 'Legal Services', sort_order: 8 },
        { id: '9', value: 'consulting', label: 'Consulting', sort_order: 9 },
        { id: '10', value: 'other', label: 'Other', sort_order: 10 }
      ]
    case 'organization_size':
      return [
        { id: '1', value: 'startup', label: 'Startup', description: '1-10 employees', sort_order: 1 },
        { id: '2', value: 'small', label: 'Small Business', description: '11-50 employees', sort_order: 2 },
        { id: '3', value: 'medium', label: 'Medium Business', description: '51-250 employees', sort_order: 3 },
        { id: '4', value: 'large', label: 'Large Business', description: '251-1000 employees', sort_order: 4 },
        { id: '5', value: 'enterprise', label: 'Enterprise', description: '1000+ employees', sort_order: 5 }
      ]
    default:
      return []
  }
}