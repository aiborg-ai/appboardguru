/**
 * Activity Translator
 * Converts technical audit log entries into user-friendly descriptions
 */

import { format } from 'date-fns'

export interface ActivityTranslation {
  title: string
  description: string
  icon: string
  color: string
  category: string
}

export interface ActivityLog {
  id: string
  timestamp: string
  type: string
  category: string
  action: string
  description: string
  outcome: 'success' | 'failure' | 'error' | 'blocked'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: {
    resourceType?: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
    endpoint?: string
    httpMethod?: string
    responseStatus?: number
    responseTime?: number
  }
  metadata?: any
  sessionId?: string
}

/**
 * Get device information from user agent
 */
function getDeviceInfo(userAgent?: string): { browser: string; device: string; os: string } {
  if (!userAgent) {
    return { browser: 'Unknown Browser', device: 'Unknown Device', os: 'Unknown OS' }
  }

  const ua = userAgent.toLowerCase()
  
  // Browser detection
  let browser = 'Unknown Browser'
  if (ua.includes('chrome') && !ua.includes('edge')) browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('edge')) browser = 'Edge'

  // OS detection
  let os = 'Unknown OS'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('ios')) os = 'iOS'

  // Device detection
  let device = 'Computer'
  if (ua.includes('mobile')) device = 'Mobile'
  else if (ua.includes('tablet')) device = 'Tablet'

  return { browser, device, os }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`
  
  return format(date, 'MMM d, yyyy \'at\' h:mm a')
}

/**
 * Get location info from IP address (placeholder for future enhancement)
 */
function getLocationInfo(ipAddress?: string): string {
  if (!ipAddress) return ''
  if (ipAddress === '::1' || ipAddress === '127.0.0.1') return 'localhost'
  
  // In a real implementation, you might use a geolocation service
  // For now, just return the IP
  return `IP: ${ipAddress}`
}

/**
 * Translate authentication activities
 */
function translateAuthenticationActivity(log: ActivityLog): ActivityTranslation {
  const { browser, device, os } = getDeviceInfo(log.details.userAgent)
  const location = getLocationInfo(log.details.ipAddress)
  const timeText = formatTimestamp(log.timestamp)

  switch (log.action) {
    case 'login_success':
      return {
        title: 'Signed In',
        description: `You successfully signed in using ${browser} on ${os}${location ? ` from ${location}` : ''} • ${timeText}`,
        icon: '🔓',
        color: 'text-green-600',
        category: 'Authentication'
      }

    case 'login_failed':
      return {
        title: 'Sign-In Failed',
        description: `Failed sign-in attempt from ${browser} on ${os}${location ? ` from ${location}` : ''} • ${timeText}`,
        icon: '❌',
        color: 'text-red-600',
        category: 'Security'
      }

    case 'logout':
      return {
        title: 'Signed Out',
        description: `You signed out from ${browser} on ${os} • ${timeText}`,
        icon: '🔒',
        color: 'text-gray-600',
        category: 'Authentication'
      }

    case 'password_change':
      return {
        title: 'Password Changed',
        description: `You changed your password using ${browser} on ${os} • ${timeText}`,
        icon: '🔑',
        color: 'text-blue-600',
        category: 'Security'
      }

    case 'mfa':
      return {
        title: 'Two-Factor Authentication',
        description: `You used two-factor authentication to sign in • ${timeText}`,
        icon: '🛡️',
        color: 'text-purple-600',
        category: 'Security'
      }

    case 'session_expired':
      return {
        title: 'Session Expired',
        description: `Your session expired and you were automatically signed out • ${timeText}`,
        icon: '⏰',
        color: 'text-orange-600',
        category: 'Authentication'
      }

    default:
      return {
        title: 'Authentication Activity',
        description: `${log.description} • ${timeText}`,
        icon: '🔐',
        color: 'text-gray-600',
        category: 'Authentication'
      }
  }
}

/**
 * Translate data access activities
 */
function translateDataAccessActivity(log: ActivityLog): ActivityTranslation {
  const timeText = formatTimestamp(log.timestamp)
  const resourceName = log.metadata?.resourceName || log.details.resourceId || 'Unknown Item'

  switch (log.action) {
    case 'file_access':
      return {
        title: 'Viewed Document',
        description: `You viewed "${resourceName}" • ${timeText}`,
        icon: '👁️',
        color: 'text-blue-600',
        category: 'Document Access'
      }

    case 'file_download':
      return {
        title: 'Downloaded File',
        description: `You downloaded "${resourceName}" • ${timeText}`,
        icon: '⬇️',
        color: 'text-green-600',
        category: 'File Operations'
      }

    case 'search':
      const searchTerm = log.metadata?.searchTerm || 'items'
      return {
        title: 'Searched Content',
        description: `You searched for "${searchTerm}" • ${timeText}`,
        icon: '🔍',
        color: 'text-indigo-600',
        category: 'Search'
      }

    case 'export':
      return {
        title: 'Exported Data',
        description: `You exported ${log.details.resourceType || 'data'} • ${timeText}`,
        icon: '📤',
        color: 'text-purple-600',
        category: 'Data Export'
      }

    case 'api_call':
      return {
        title: 'API Access',
        description: `You accessed ${log.details.endpoint || 'an API endpoint'} • ${timeText}`,
        icon: '🔌',
        color: 'text-gray-600',
        category: 'API Access'
      }

    default:
      return {
        title: 'Data Access',
        description: `${log.description} • ${timeText}`,
        icon: '📊',
        color: 'text-blue-600',
        category: 'Data Access'
      }
  }
}

/**
 * Translate data modification activities
 */
function translateDataModificationActivity(log: ActivityLog): ActivityTranslation {
  const timeText = formatTimestamp(log.timestamp)
  const resourceName = log.metadata?.resourceName || log.details.resourceId || 'Unknown Item'

  switch (log.action) {
    case 'create':
      return {
        title: 'Created Item',
        description: `You created "${resourceName}" • ${timeText}`,
        icon: '➕',
        color: 'text-green-600',
        category: 'Content Creation'
      }

    case 'update':
      return {
        title: 'Updated Item',
        description: `You updated "${resourceName}" • ${timeText}`,
        icon: '✏️',
        color: 'text-blue-600',
        category: 'Content Editing'
      }

    case 'delete':
      return {
        title: 'Deleted Item',
        description: `You deleted "${resourceName}" • ${timeText}`,
        icon: '🗑️',
        color: 'text-red-600',
        category: 'Content Deletion'
      }

    case 'import':
      return {
        title: 'Imported Data',
        description: `You imported ${log.details.resourceType || 'data'} • ${timeText}`,
        icon: '📥',
        color: 'text-indigo-600',
        category: 'Data Import'
      }

    case 'bulk_operation':
      const count = log.metadata?.affectedItems || 'multiple'
      return {
        title: 'Bulk Operation',
        description: `You performed a bulk operation on ${count} items • ${timeText}`,
        icon: '📋',
        color: 'text-purple-600',
        category: 'Bulk Operations'
      }

    default:
      return {
        title: 'Data Modification',
        description: `${log.description} • ${timeText}`,
        icon: '📝',
        color: 'text-orange-600',
        category: 'Data Modification'
      }
  }
}

/**
 * Translate authorization activities
 */
function translateAuthorizationActivity(log: ActivityLog): ActivityTranslation {
  const timeText = formatTimestamp(log.timestamp)

  switch (log.action) {
    case 'access_granted':
      return {
        title: 'Access Granted',
        description: `You were granted access to ${log.details.resourceType || 'a resource'} • ${timeText}`,
        icon: '✅',
        color: 'text-green-600',
        category: 'Permissions'
      }

    case 'access_denied':
      return {
        title: 'Access Denied',
        description: `Access was denied to ${log.details.resourceType || 'a resource'} • ${timeText}`,
        icon: '🚫',
        color: 'text-red-600',
        category: 'Security'
      }

    case 'role_change':
      return {
        title: 'Role Changed',
        description: `Your role was changed • ${timeText}`,
        icon: '👤',
        color: 'text-blue-600',
        category: 'Account Changes'
      }

    default:
      return {
        title: 'Authorization Activity',
        description: `${log.description} • ${timeText}`,
        icon: '🔐',
        color: 'text-gray-600',
        category: 'Authorization'
      }
  }
}

/**
 * Translate security events
 */
function translateSecurityEvent(log: ActivityLog): ActivityTranslation {
  const timeText = formatTimestamp(log.timestamp)
  const { browser, os } = getDeviceInfo(log.details.userAgent)
  const location = getLocationInfo(log.details.ipAddress)

  switch (log.action) {
    case 'suspicious_activity':
      return {
        title: 'Suspicious Activity Detected',
        description: `Unusual activity detected from ${browser} on ${os}${location ? ` from ${location}` : ''} • ${timeText}`,
        icon: '⚠️',
        color: 'text-red-600',
        category: 'Security Alert'
      }

    case 'rate_limit_exceeded':
      return {
        title: 'Rate Limit Exceeded',
        description: `Too many requests made in a short time period • ${timeText}`,
        icon: '🛑',
        color: 'text-orange-600',
        category: 'Security'
      }

    case 'ip_blocked':
      return {
        title: 'IP Address Blocked',
        description: `Access temporarily blocked due to suspicious activity${location ? ` from ${location}` : ''} • ${timeText}`,
        icon: '🚨',
        color: 'text-red-600',
        category: 'Security'
      }

    default:
      return {
        title: 'Security Event',
        description: `${log.description} • ${timeText}`,
        icon: '🛡️',
        color: 'text-red-600',
        category: 'Security'
      }
  }
}

/**
 * Translate user action activities
 */
function translateUserActionActivity(log: ActivityLog): ActivityTranslation {
  const timeText = formatTimestamp(log.timestamp)

  return {
    title: 'User Action',
    description: `${log.description} • ${timeText}`,
    icon: '👤',
    color: 'text-gray-600',
    category: 'User Actions'
  }
}

/**
 * Main translation function
 */
export function translateActivityLog(log: ActivityLog): ActivityTranslation {
  try {
    switch (log.type) {
      case 'authentication':
        return translateAuthenticationActivity(log)
      
      case 'data_access':
        return translateDataAccessActivity(log)
      
      case 'data_modification':
        return translateDataModificationActivity(log)
      
      case 'authorization':
        return translateAuthorizationActivity(log)
      
      case 'security_event':
        return translateSecurityEvent(log)
      
      case 'user_action':
        return translateUserActionActivity(log)
      
      default:
        const timeText = formatTimestamp(log.timestamp)
        return {
          title: 'Activity',
          description: `${log.description} • ${timeText}`,
          icon: '📝',
          color: 'text-gray-600',
          category: 'General'
        }
    }
  } catch (error) {
    console.error('Error translating activity log:', error)
    const timeText = formatTimestamp(log.timestamp)
    return {
      title: 'Activity',
      description: `${log.description} • ${timeText}`,
      icon: '📝',
      color: 'text-gray-600',
      category: 'General'
    }
  }
}

/**
 * Get activity statistics
 */
export function getActivityStats(logs: ActivityLog[]) {
  const stats = {
    total: logs.length,
    byType: {} as Record<string, number>,
    byOutcome: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    recentSignIns: 0,
    failedAttempts: 0
  }

  logs.forEach(log => {
    // Count by type
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1
    
    // Count by outcome
    stats.byOutcome[log.outcome] = (stats.byOutcome[log.outcome] || 0) + 1
    
    // Count by severity
    stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1

    // Count recent sign-ins (last 7 days)
    const logDate = new Date(log.timestamp)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (log.type === 'authentication' && log.action === 'login_success' && logDate > weekAgo) {
      stats.recentSignIns++
    }

    // Count failed attempts
    if (log.type === 'authentication' && log.outcome === 'failure') {
      stats.failedAttempts++
    }
  })

  return stats
}