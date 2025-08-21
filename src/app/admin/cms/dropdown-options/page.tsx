'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings, 
  ChevronDown,
  ChevronUp,
  Shield
} from 'lucide-react'

interface DropdownOption {
  id: string
  value: string
  label: string
  description?: string
  sort_order: number
  metadata?: any
  is_system: boolean
}

interface DropdownCategory {
  name: string
  label: string
  description?: string
}

const CATEGORIES: DropdownCategory[] = [
  { name: 'industry', label: 'Industries', description: 'Organization industry types' },
  { name: 'organization_size', label: 'Organization Sizes', description: 'Company size categories' },
  { name: 'compliance_standards', label: 'Compliance Standards', description: 'Regulatory standards' },
  { name: 'asset_categories', label: 'Asset Categories', description: 'Document categories' },
  { name: 'meeting_types', label: 'Meeting Types', description: 'Types of meetings' }
]

export default function DropdownOptionsManagement() {
  const [selectedCategory, setSelectedCategory] = useState<string>('industry')
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newOption, setNewOption] = useState({
    value: '',
    label: '',
    description: '',
    sort_order: 999
  })

  // Fetch options for selected category
  const fetchOptions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cms/dropdown-options?category=${selectedCategory}`)
      const result = await response.json()
      
      if (response.ok) {
        setOptions(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching options:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create new option
  const handleCreateOption = async () => {
    try {
      const response = await fetch('/api/cms/dropdown-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          ...newOption
        })
      })

      if (response.ok) {
        setNewOption({ value: '', label: '', description: '', sort_order: 999 })
        setIsCreating(false)
        fetchOptions()
      }
    } catch (error) {
      console.error('Error creating option:', error)
    }
  }

  // Update option
  const handleUpdateOption = async (optionId: string, updates: Partial<DropdownOption>) => {
    try {
      const response = await fetch(`/api/cms/dropdown-options/${optionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setEditingOption(null)
        fetchOptions()
      }
    } catch (error) {
      console.error('Error updating option:', error)
    }
  }

  // Delete option
  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return

    try {
      const response = await fetch(`/api/cms/dropdown-options/${optionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchOptions()
      }
    } catch (error) {
      console.error('Error deleting option:', error)
    }
  }

  useEffect(() => {
    fetchOptions()
  }, [selectedCategory])

  const currentCategory = CATEGORIES.find(cat => cat.name === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dropdown Options Management</h1>
            <p className="text-gray-600 mt-1">Manage dynamic dropdown options across the application</p>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>Admin Only</span>
          </Badge>
        </div>

        {/* Category Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.name)}
                  className="h-auto p-4 flex flex-col items-start text-left"
                >
                  <span className="font-medium">{category.label}</span>
                  <span className="text-xs text-gray-500 mt-1">{category.description}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Options Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentCategory?.label}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{currentCategory?.description}</p>
              </div>
              <Button 
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Option</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Create New Option Form */}
            {isCreating && (
              <div className="border rounded-lg p-4 mb-6 bg-blue-50">
                <h4 className="font-medium mb-4">Create New Option</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Value</Label>
                    <Input
                      placeholder="option_value"
                      value={newOption.value}
                      onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      placeholder="Display Label"
                      value={newOption.label}
                      onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      placeholder="999"
                      value={newOption.sort_order}
                      onChange={(e) => setNewOption(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 999 }))}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional description"
                    value={newOption.description}
                    onChange={(e) => setNewOption(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button onClick={handleCreateOption} size="sm">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreating(false)
                      setNewOption({ value: '', label: '', description: '', sort_order: 999 })
                    }}
                    size="sm"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Options List */}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div 
                    key={option.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex-1">
                      {editingOption?.id === option.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Input
                            value={editingOption.value}
                            onChange={(e) => setEditingOption(prev => prev ? { ...prev, value: e.target.value } : null)}
                            placeholder="Value"
                          />
                          <Input
                            value={editingOption.label}
                            onChange={(e) => setEditingOption(prev => prev ? { ...prev, label: e.target.value } : null)}
                            placeholder="Label"
                          />
                          <Input
                            type="number"
                            value={editingOption.sort_order}
                            onChange={(e) => setEditingOption(prev => prev ? { ...prev, sort_order: parseInt(e.target.value) || 0 } : null)}
                            placeholder="Sort Order"
                          />
                          <Input
                            value={editingOption.description || ''}
                            onChange={(e) => setEditingOption(prev => prev ? { ...prev, description: e.target.value } : null)}
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              #{option.sort_order}
                            </Badge>
                            <span className="font-medium">{option.label}</span>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {option.value}
                            </code>
                            {option.is_system && (
                              <Badge variant="secondary" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-sm text-gray-600">{option.description}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {editingOption?.id === option.id ? (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => handleUpdateOption(option.id, editingOption)}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingOption(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingOption(option)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {!option.is_system && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteOption(option.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          <div className="flex flex-col space-y-1">
                            {index > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOption(option.id, { sort_order: option.sort_order - 1 })}
                                className="h-5 w-5 p-0"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                            )}
                            {index < options.length - 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUpdateOption(option.id, { sort_order: option.sort_order + 1 })}
                                className="h-5 w-5 p-0"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {options.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    No options found for this category
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Usage Guidelines</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Value Format</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Use lowercase with underscores</li>
                  <li>• Example: "financial_services"</li>
                  <li>• Must be unique within category</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">System Options</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Cannot be deleted</li>
                  <li>• Core to application functionality</li>
                  <li>• Can only be edited by developers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}