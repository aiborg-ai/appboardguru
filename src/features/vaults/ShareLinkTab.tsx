'use client'

import React, { useState, useEffect } from 'react'
import { 
  Link, 
  Copy, 
  Check, 
  Globe,
  Lock,
  AlertCircle,
  RefreshCw,
  QrCode,
  Eye,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

interface ShareLinkTabProps {
  vaultId: string
  vaultName: string
  isPublic?: boolean
  onShare: () => void
  isSharing: boolean
  setIsSharing: (value: boolean) => void
}

interface ShareLink {
  id: string
  url: string
  expires_at: string | null
  max_uses: number | null
  used_count: number
  permission: string
  password_protected: boolean
  created_at: string
}

export function ShareLinkTab({ 
  vaultId, 
  vaultName,
  isPublic = false,
  onShare, 
  isSharing, 
  setIsSharing 
}: ShareLinkTabProps) {
  const [isPublicAccess, setIsPublicAccess] = useState(isPublic)
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  
  // Link settings
  const [permission, setPermission] = useState('viewer')
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [maxUses, setMaxUses] = useState<string>('unlimited')
  const [requirePassword, setRequirePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [allowDownload, setAllowDownload] = useState(false)

  // Generate a mock share link
  const generateShareLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const linkId = Math.random().toString(36).substring(7)
    return {
      id: linkId,
      url: `${baseUrl}/vault/share/${vaultId}?token=${linkId}`,
      expires_at: expiresIn === 'never' ? null : new Date(Date.now() + getExpirationMs(expiresIn)).toISOString(),
      max_uses: maxUses === 'unlimited' ? null : parseInt(maxUses),
      used_count: 0,
      permission,
      password_protected: requirePassword,
      created_at: new Date().toISOString()
    }
  }

  const getExpirationMs = (period: string) => {
    const ms: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }
    return ms[period] || 0
  }

  // Create share link
  const handleCreateLink = async () => {
    setIsSharing(true)
    
    try {
      // TODO: Call API to create share link
      const linkData = {
        vault_id: vaultId,
        permission,
        expires_in: expiresIn === 'never' ? null : expiresIn,
        max_uses: maxUses === 'unlimited' ? null : parseInt(maxUses),
        password: requirePassword ? password : null,
        allow_download: allowDownload
      }
      
      console.log('Creating share link:', linkData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate mock link
      const newLink = generateShareLink()
      setShareLink(newLink)
      
      onShare()
    } catch (error) {
      console.error('Failed to create share link:', error)
    } finally {
      setIsSharing(false)
    }
  }

  // Copy link to clipboard
  const copyToClipboard = () => {
    if (!shareLink) return
    
    navigator.clipboard.writeText(shareLink.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Regenerate link
  const regenerateLink = () => {
    const newLink = generateShareLink()
    setShareLink(newLink)
  }

  // Toggle public access
  const togglePublicAccess = async () => {
    setIsSharing(true)
    
    try {
      // TODO: Call API to update vault public status
      console.log('Updating vault public access:', !isPublicAccess)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsPublicAccess(!isPublicAccess)
      
      if (!isPublicAccess && !shareLink) {
        // Generate a public link when enabling public access
        const newLink = generateShareLink()
        setShareLink(newLink)
      }
    } catch (error) {
      console.error('Failed to update public access:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Public Access Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            {isPublicAccess ? (
              <Globe className="w-5 h-5 text-blue-600" />
            ) : (
              <Lock className="w-5 h-5 text-gray-600" />
            )}
          </div>
          <div>
            <Label className="text-base font-medium">Public Access</Label>
            <p className="text-sm text-gray-500">
              {isPublicAccess 
                ? 'Anyone with the link can access this vault'
                : 'Only invited users can access this vault'}
            </p>
          </div>
        </div>
        <Switch
          checked={isPublicAccess}
          onCheckedChange={togglePublicAccess}
          disabled={isSharing}
        />
      </div>

      {isPublicAccess && (
        <>
          {/* Link Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Viewer - View only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="downloader">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span>Downloader - View & Download</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Link Expiration</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 use</SelectItem>
                    <SelectItem value="5">5 uses</SelectItem>
                    <SelectItem value="10">10 uses</SelectItem>
                    <SelectItem value="25">25 uses</SelectItem>
                    <SelectItem value="100">100 uses</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Password Protection</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={requirePassword}
                    onCheckedChange={setRequirePassword}
                  />
                  <span className="text-sm text-gray-600">
                    {requirePassword ? 'Protected' : 'No password'}
                  </span>
                </div>
              </div>
            </div>

            {requirePassword && (
              <div className="space-y-2">
                <Label>Access Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password for link access"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Users will need this password to access the vault
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Allow Downloads</Label>
                <p className="text-xs text-gray-500">
                  Users can download assets from this vault
                </p>
              </div>
              <Switch
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>
          </div>

          {/* Generate Link Button */}
          {!shareLink && (
            <div className="flex justify-center">
              <Button
                onClick={handleCreateLink}
                disabled={isSharing || (requirePassword && !password)}
                className="w-full max-w-xs"
              >
                {isSharing ? 'Creating Link...' : 'Generate Share Link'}
              </Button>
            </div>
          )}

          {/* Share Link Display */}
          {shareLink && (
            <div className="space-y-4">
              <Separator />
              
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareLink.url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={regenerateLink}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Link Info */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Permission:</span>
                  <span className="font-medium capitalize">{shareLink.permission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium">
                    {shareLink.expires_at 
                      ? new Date(shareLink.expires_at).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Usage Limit:</span>
                  <span className="font-medium">
                    {shareLink.max_uses 
                      ? `${shareLink.used_count}/${shareLink.max_uses} uses`
                      : 'Unlimited'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-medium">
                    {shareLink.password_protected ? 'Required' : 'None'}
                  </span>
                </div>
              </div>

              {/* QR Code Option */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-gray-600" />
                  <div>
                    <Label className="text-sm font-medium">QR Code</Label>
                    <p className="text-xs text-gray-500">
                      Generate QR code for easy sharing
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQR(!showQR)}
                >
                  {showQR ? 'Hide' : 'Show'} QR
                </Button>
              </div>

              {showQR && (
                <div className="flex justify-center p-4 border rounded-lg bg-white">
                  <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!isPublicAccess && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Enable public access to generate shareable links for this vault. 
            You can control permissions and set expiration dates for each link.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}