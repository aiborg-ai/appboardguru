'use client'

import React, { useState } from 'react'
import { 
  Mail, 
  Plus, 
  X, 
  AlertCircle,
  Eye,
  UserCheck,
  Shield,
  Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ShareExternalTabProps {
  vaultId: string
  vaultName: string
  onShare: () => void
  isSharing: boolean
  setIsSharing: (value: boolean) => void
}

const PERMISSION_LEVELS = [
  { 
    value: 'viewer', 
    label: 'Viewer', 
    description: 'Can view vault contents only',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800'
  },
  { 
    value: 'member', 
    label: 'Member', 
    description: 'Can view and download assets',
    icon: UserCheck,
    color: 'bg-blue-100 text-blue-800'
  }
]

export function ShareExternalTab({ 
  vaultId, 
  vaultName,
  onShare, 
  isSharing, 
  setIsSharing 
}: ShareExternalTabProps) {
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [permission, setPermission] = useState<string>('viewer')
  const [message, setMessage] = useState('')
  const [expiresIn, setExpiresIn] = useState<string>('30d')
  const [emailError, setEmailError] = useState('')
  const [requireAuth, setRequireAuth] = useState(true)

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Add email to list
  const addEmail = () => {
    const email = emailInput.trim().toLowerCase()
    
    if (!email) return
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    if (emails.includes(email)) {
      setEmailError('This email is already in the list')
      return
    }
    
    if (emails.length >= 10) {
      setEmailError('You can invite up to 10 external users at once')
      return
    }
    
    setEmails([...emails, email])
    setEmailInput('')
    setEmailError('')
  }

  // Remove email from list
  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove))
  }

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
  }

  // Handle paste of multiple emails
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const pastedEmails = pastedText
      .split(/[\s,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email && validateEmail(email))
    
    const uniqueEmails = [...new Set([...emails, ...pastedEmails])].slice(0, 10)
    setEmails(uniqueEmails)
    setEmailInput('')
  }

  // Handle share action
  const handleShare = async () => {
    if (emails.length === 0) return
    
    setIsSharing(true)
    
    try {
      // TODO: Call API to share vault with external users
      const shareData = {
        vault_id: vaultId,
        emails,
        permission,
        message: message.trim() || undefined,
        expires_in: expiresIn,
        require_auth: requireAuth
      }
      
      console.log('Sharing vault with external users:', shareData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Clear form
      setEmails([])
      setMessage('')
      
      onShare()
    } catch (error) {
      console.error('Failed to share vault:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          External collaborators will receive an email invitation to access this vault. 
          They'll need to create an account or sign in to view the shared content.
        </AlertDescription>
      </Alert>

      {/* Email Input */}
      <div className="space-y-2">
        <Label>Email Addresses</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value)
              setEmailError('')
            }}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addEmail}
            disabled={!emailInput.trim()}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {emailError && (
          <p className="text-sm text-red-500">{emailError}</p>
        )}
        <p className="text-xs text-gray-500">
          You can paste multiple emails separated by commas, spaces, or semicolons
        </p>
      </div>

      {/* Email List */}
      {emails.length > 0 && (
        <div className="space-y-2">
          <Label>Recipients ({emails.length}/10)</Label>
          <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
            {emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeEmail(email)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Level */}
      <div className="space-y-2">
        <Label>Permission Level</Label>
        <Select value={permission} onValueChange={setPermission}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {PERMISSION_LEVELS.map((level) => {
              const Icon = level.icon
              return (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-gray-500">{level.description}</div>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          External users cannot be given admin or owner permissions for security reasons
        </p>
      </div>

      {/* Optional Message */}
      <div className="space-y-2">
        <Label>Message (Optional)</Label>
        <Textarea
          placeholder={`Hi, I'm sharing the "${vaultName}" vault with you. This contains important documents that I think you'll find useful.`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
      </div>

      {/* Access Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Access Expiration</Label>
          <Select value={expiresIn} onValueChange={setExpiresIn}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
              <SelectItem value="never">Never expires</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Require Authentication</Label>
            <p className="text-xs text-gray-500">
              Recipients must create an account to access the vault
            </p>
          </div>
          <input
            type="checkbox"
            checked={requireAuth}
            onChange={(e) => setRequireAuth(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Share Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="default"
          onClick={handleShare}
          disabled={emails.length === 0 || isSharing}
        >
          {isSharing ? 'Sending Invitations...' : `Send to ${emails.length} Recipient${emails.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}