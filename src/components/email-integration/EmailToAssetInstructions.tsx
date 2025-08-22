/**
 * Email to Asset Instructions Component
 * Shows users how to send documents via email to create assets
 */

import React, { useState } from 'react'
import { Mail, Copy, CheckCircle, FileText, Shield, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'

export const EmailToAssetInstructions = React.memo(function EmailToAssetInstructions() {
  const [copiedEmail, setCopiedEmail] = useState(false)
  
  // TODO: This should come from environment/config
  const emailAddress = 'assets@appboardguru.com'
  
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailAddress)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          Send Documents via Email
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Instructions */}
        <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            How it works
          </h4>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">1</span>
              <span>Send an email to <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{emailAddress}</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">2</span>
              <span>Start the subject line with <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">Asset::</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">3</span>
              <span>Attach your documents (PDF, Word, Excel, PowerPoint, images)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">4</span>
              <span>Your attachments will automatically appear in your assets</span>
            </li>
          </ol>
        </div>

        {/* Email Address with Copy */}
        <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-3">Email Address</h4>
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 border">
            <Mail className="h-4 w-4 text-gray-400" />
            <code className="font-mono text-sm flex-1 text-gray-700">{emailAddress}</code>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCopyEmail}
              className="shrink-0"
            >
              {copiedEmail ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Subject Line Example */}
        <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-3">Subject Line Examples</h4>
          <div className="space-y-2">
            <div className="bg-white rounded p-3 border border-gray-200 font-mono text-sm text-gray-700">
              Asset:: Board Meeting Minutes - January 2024
            </div>
            <div className="bg-white rounded p-3 border border-gray-200 font-mono text-sm text-gray-700">
              Asset:: Q4 Financial Report
            </div>
            <div className="bg-white rounded p-3 border border-gray-200 font-mono text-sm text-gray-700">
              Asset:: Contract Review Documents
            </div>
          </div>
        </div>

        {/* Security & Limits */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              Security
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Only registered users can send documents</li>
              <li>• All files are virus scanned</li>
              <li>• Encrypted storage and transfer</li>
              <li>• Audit trail for all uploads</li>
            </ul>
          </div>
          
          <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Limits
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Maximum 10 emails per hour</li>
              <li>• 50MB per attachment</li>
              <li>• Up to 10 attachments per email</li>
              <li>• Processing takes 1-2 minutes</li>
            </ul>
          </div>
        </div>

        {/* Supported File Types */}
        <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-3">Supported File Types</h4>
          <div className="flex flex-wrap gap-2">
            {[
              'PDF', 'Word', 'Excel', 'PowerPoint', 'Text', 'CSV', 
              'JPEG', 'PNG', 'GIF'
            ].map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Important Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> You must send emails from the same email address associated with your AppBoardGuru account. 
            Emails from unregistered addresses will be rejected.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
})