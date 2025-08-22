/**
 * Migration Example: How to Apply the Advanced Type Bridge Solution
 * 
 * This file demonstrates how to migrate existing components that have
 * the same TypeScript error as InviteMemberModal to use the advanced
 * type bridge solution.
 */

import React from 'react'
import { 
  useLightweightForm, 
  type FieldProps 
} from './lightweight-form'
import { 
  transformFieldProps, 
  createFormBridge,
  createFieldValueTransformer,
  type FormBridgeConfig 
} from './advanced-type-bridge'

// ============================================================================
// EXAMPLE 1: Simple Migration (Minimal Changes)
// ============================================================================

interface SimpleFormData {
  category: string
  priority: number
}

function SimpleFormExample() {
  const [formState, formActions] = useLightweightForm<SimpleFormData>({
    fields: {
      category: {
        validation: { required: 'Category is required' }
      },
      priority: {
        validation: { 
          required: 'Priority is required',
          min: 1,
          max: 5
        },
        transform: (value: string) => parseInt(value, 10)
      }
    },
    validateOnBlur: true
  })

  return (
    <form {...formActions.getFormProps()}>
      {/* BEFORE: This would cause TypeScript error */}
      {/* <select {...formActions.getFieldProps('category')}> */}
      
      {/* AFTER: Using transformFieldProps fixes the error */}
      <select {...transformFieldProps(formActions.getFieldProps('category'), 'category')}>
        <option value="">Select Category</option>
        <option value="urgent">Urgent</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>

      <select {...transformFieldProps(formActions.getFieldProps('priority'), 'priority')}>
        <option value="">Select Priority</option>
        <option value="1">1 - Highest</option>
        <option value="2">2 - High</option>
        <option value="3">3 - Medium</option>
        <option value="4">4 - Low</option>
        <option value="5">5 - Lowest</option>
      </select>

      <button type="submit">Submit</button>
    </form>
  )
}

// ============================================================================
// EXAMPLE 2: Advanced Migration (Using Full Type Bridge)
// ============================================================================

interface AdvancedFormData {
  department: string
  budget: number
  deadline: Date
  isUrgent: boolean
}

// Create advanced type adapters
const budgetAdapter = createFieldValueTransformer<string, number>(
  (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) {
      throw new Error('Budget must be a positive number')
    }
    return num
  },
  (value: number) => value.toFixed(2)
)

const dateAdapter = createFieldValueTransformer<string, Date>(
  (value: string) => {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format')
    }
    return date
  },
  (value: Date) => value.toISOString().split('T')[0] ?? ''
)

// Advanced form bridge configuration
const advancedFormConfig: FormBridgeConfig<AdvancedFormData> = {
  fieldTransformers: {
    budget: value: unknown) => budgetAdapter.transform(value),
    deadline: value: unknown) => dateAdapter.transform(value),
    isUrgent: value: unknown) => value === 'true' || value === true
  },
  fieldValidators: {
    department: value: unknown) => {
      if (!value || value.trim().length < 2) {
        return 'Department name must be at least 2 characters'
      }
      return true
    },
    budget: value: unknown) => {
      try {
        const transformed = budgetAdapter.transform(value)
        if (transformed < 1000) {
          return 'Budget must be at least $1,000'
        }
        if (transformed > 1000000) {
          return 'Budget cannot exceed $1,000,000'
        }
        return true
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid budget'
      }
    },
    deadline: value: unknown) => {
      try {
        const date = dateAdapter.transform(value)
        const now = new Date()
        if (date < now) {
          return 'Deadline cannot be in the past'
        }
        return true
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid date'
      }
    }
  },
  typeAdapters: {
    budget: budgetAdapter,
    deadline: dateAdapter
  },
  metadataExtractors: {
    budget: () => ({ type: 'currency', format: 'USD' }),
    deadline: () => ({ type: 'date', format: 'YYYY-MM-DD' })
  }
}

function AdvancedFormExample() {
  // Create form bridge with advanced configuration
  const formBridge = createFormBridge<AdvancedFormData>({
    department: '',
    budget: 0,
    deadline: new Date(),
    isUrgent: false
  }, advancedFormConfig)

  // Use lightweight form with enhanced validation
  const [formState, formActions] = useLightweightForm<AdvancedFormData>({
    fields: {
      department: {
        validation: {
          required: 'Department is required',
          custom: value: unknown) => {
            const result = formBridge.validateField('department', value)
            return result === true ? undefined : result
          }
        }
      },
      budget: {
        validation: {
          required: 'Budget is required',
          custom: value: unknown) => {
            const result = formBridge.validateField('budget', value)
            return result === true ? undefined : result
          }
        },
        transform: (value: string) => budgetAdapter.transform(value)
      },
      deadline: {
        validation: {
          required: 'Deadline is required',
          custom: value: unknown) => {
            const result = formBridge.validateField('deadline', value)
            return result === true ? undefined : result
          }
        },
        transform: (value: string) => dateAdapter.transform(value)
      },
      isUrgent: {
        validation: {
          custom: value: unknown) => undefined // Always valid for boolean
        },
        transform: (value: string) => value === 'true'
      }
    },
    validateOnBlur: true,
    onSubmit: async (data) => {
      // Apply final transformations
      const transformedData = formBridge.getProxy()
      console.log('Submitting:', transformedData)
    }
  })

  // Enhanced field props getter
  const getEnhancedFieldProps = React.useCallback(<K extends keyof AdvancedFormData>(
    fieldName: K
  ): React.SelectHTMLAttributes<HTMLSelectElement> => {
    const originalProps = formActions.getFieldProps(fieldName)
    return formBridge.transformFieldProps(originalProps, fieldName)
  }, [formActions, formBridge])

  return (
    <form {...formActions.getFormProps()} className="space-y-4">
      {/* Department Selection */}
      <div>
        <label htmlFor="department">Department</label>
        <select {...getEnhancedFieldProps('department')} id="department">
          <option value="">Select Department</option>
          <option value="engineering">Engineering</option>
          <option value="marketing">Marketing</option>
          <option value="sales">Sales</option>
          <option value="hr">Human Resources</option>
        </select>
        {formState.errors.department && (
          <p className="error">{formState.errors.department}</p>
        )}
      </div>

      {/* Budget Input */}
      <div>
        <label htmlFor="budget">Budget ($)</label>
        <input
          type="number"
          step="0.01"
          min="1000"
          max="1000000"
          {...(formActions.getFieldProps('budget') as any)}
          id="budget"
        />
        {formState.errors.budget && (
          <p className="error">{formState.errors.budget}</p>
        )}
      </div>

      {/* Deadline Input */}
      <div>
        <label htmlFor="deadline">Deadline</label>
        <input
          type="date"
          {...(formActions.getFieldProps('deadline') as any)}
          id="deadline"
        />
        {formState.errors.deadline && (
          <p className="error">{formState.errors.deadline}</p>
        )}
      </div>

      {/* Urgency Selection */}
      <div>
        <label htmlFor="isUrgent">Priority</label>
        <select {...getEnhancedFieldProps('isUrgent')} id="isUrgent">
          <option value="false">Normal Priority</option>
          <option value="true">Urgent</option>
        </select>
      </div>

      <button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}

// ============================================================================
// EXAMPLE 3: Custom Hook for Type-Safe Forms
// ============================================================================

/**
 * Custom hook that automatically applies the type bridge solution
 */
function useTypeSafeForm<T extends Record<string, unknown>>(
  initialData: Partial<T>,
  config: FormBridgeConfig<T> = {}
) {
  // Create form bridge
  const formBridge = React.useMemo(() => 
    createFormBridge(initialData as T, config), 
    [initialData, config]
  )

  // Enhanced field props getter
  const getTypeSafeFieldProps = React.useCallback(<K extends keyof T>(
    originalFieldProps: FieldProps,
    fieldName: K
  ): React.SelectHTMLAttributes<HTMLSelectElement> => {
    return formBridge.transformFieldProps(originalFieldProps, fieldName)
  }, [formBridge])

  // Enhanced validation
  const validateWithBridge = React.useCallback(<K extends keyof T>(
    fieldName: K,
    value: any
  ): true | string => {
    return formBridge.validateField(fieldName, value)
  }, [formBridge])

  return {
    formBridge,
    getTypeSafeFieldProps,
    validateWithBridge
  }
}

// Usage of the custom hook
function CustomHookExample() {
  interface FormData {
    status: string
    score: number
  }

  const { getTypeSafeFieldProps, validateWithBridge } = useTypeSafeForm<FormData>(
    { status: '', score: 0 },
    {
      fieldValidators: {
        score: value: unknown) => {
          const num = typeof value === 'string' ? parseInt(value, 10) : value
          return (num >= 0 && num <= 100) ? true : 'Score must be between 0 and 100'
        }
      }
    }
  )

  const [formState, formActions] = useLightweightForm<FormData>({
    fields: {
      status: { validation: { required: 'Status is required' } },
      score: {
        validation: {
          required: 'Score is required',
          custom: value: unknown) => {
            const result = validateWithBridge('score', value)
            return result === true ? undefined : result
          }
        },
        transform: (value: string) => parseInt(value, 10)
      }
    },
    validateOnBlur: true
  })

  return (
    <form {...formActions.getFormProps()}>
      <select {...getTypeSafeFieldProps(formActions.getFieldProps('status'), 'status')}>
        <option value="">Select Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pending">Pending</option>
      </select>

      <input
        type="number"
        min="0"
        max="100"
        {...(formActions.getFieldProps('score') as any)}
      />

      <button type="submit">Submit</button>
    </form>
  )
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/*
MIGRATION STEPS:

1. IDENTIFY THE ERROR:
   Look for TypeScript errors like:
   "Type '{ onChange: (event: Event) => void; onBlur: (event: Event) => void; ... }' 
   is not assignable to type 'SelectHTMLAttributes<HTMLSelectElement>'"

2. APPLY MINIMAL FIX:
   Replace:
   <select {...formActions.getFieldProps('fieldName')}>
   
   With:
   <select {...transformFieldProps(formActions.getFieldProps('fieldName'), 'fieldName')}>

3. FOR ADVANCED CASES:
   - Create FormBridgeConfig with validators and transformers
   - Use createFormBridge for enhanced type safety
   - Implement custom field value transformers
   - Add runtime validation with type checking

4. OPTIONAL ENHANCEMENTS:
   - Create custom hooks for reusable type-safe form logic
   - Add metadata extractors for enhanced field information
   - Implement caching for performance optimization
   - Add error boundaries for graceful error handling

5. TESTING:
   - Verify TypeScript compilation passes
   - Test form submission with transformed data
   - Validate error handling and edge cases
   - Check performance with large forms
*/

export {
  SimpleFormExample,
  AdvancedFormExample,
  CustomHookExample,
  useTypeSafeForm
}