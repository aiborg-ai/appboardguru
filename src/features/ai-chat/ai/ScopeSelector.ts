import { Globe, Bot, Building2, Folder, FileIcon, Users } from 'lucide-react'

export interface ChatScope {
  type: 'global' | 'organization' | 'meeting' | 'document' | 'team'
  id: string
  label: string
  description?: string
}

export interface ContextScopeOption {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export const CONTEXT_SCOPE_OPTIONS: ContextScopeOption[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Full access to all information and online resources',
    icon: Globe
  },
  {
    id: 'boardguru',
    label: 'BoardGuru',
    description: 'Limited to BoardGuru platform knowledge and features',
    icon: Bot
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'Scoped to current organization data and context',
    icon: Building2
  },
  {
    id: 'vault',
    label: 'Current Vault',
    description: 'Limited to selected vault content and assets',
    icon: Folder
  },
  {
    id: 'asset',
    label: 'Current Asset',
    description: 'Focused on specific asset analysis and insights',
    icon: FileIcon
  }
]

// Map RightPanel context scopes to ChatScope format
export function mapContextScopeToChat(contextScope: string, contextData?: {
  organizationName?: string
  organizationId?: string
  vaultName?: string
  vaultId?: string
  assetName?: string
  assetId?: string
}): ChatScope {
  switch (contextScope) {
    case 'general':
      return {
        type: 'global',
        id: 'global',
        label: 'General',
        description: 'Full access to all information and online resources'
      }
    
    case 'boardguru':
      return {
        type: 'global', // Use global type but with specific context
        id: 'boardguru',
        label: 'BoardGuru',
        description: 'Limited to BoardGuru platform knowledge and features'
      }
    
    case 'organization':
      return {
        type: 'organization',
        id: contextData?.organizationId || 'selected-org',
        label: contextData?.organizationName || 'Selected Organization',
        description: `Scoped to ${contextData?.organizationName || 'selected organization'} data and context`
      }
    
    case 'vault':
      return {
        type: 'document', // Vault can be treated as document collection
        id: contextData?.vaultId || 'selected-vault',
        label: contextData?.vaultName ? `Vault: ${contextData.vaultName}` : 'Selected Vault',
        description: `Limited to ${contextData?.vaultName || 'selected vault'} content and assets`
      }
    
    case 'asset':
      return {
        type: 'document',
        id: contextData?.assetId || 'selected-asset',
        label: contextData?.assetName || 'Selected Asset',
        description: `Focused on ${contextData?.assetName || 'selected asset'} analysis and insights`
      }
    
    default:
      return {
        type: 'global',
        id: 'boardguru',
        label: 'BoardGuru',
        description: 'BoardGuru platform assistance'
      }
  }
}