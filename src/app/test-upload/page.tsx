'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setError(null)
      setResult(null)
    }
  }

  const testSimpleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)

      console.log('Testing simple upload endpoint...')
      const response = await fetch('/api/assets/upload-simple', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      console.log('Simple upload response:', data)

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`)
      }

      setResult(data)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const testComplexUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      formData.append('description', 'Test upload')
      formData.append('category', 'test')

      console.log('Testing complex upload endpoint...')
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      console.log('Complex upload response:', data)

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`)
      }

      setResult(data)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const checkEndpoints = async () => {
    try {
      // Check simple endpoint
      const simpleRes = await fetch('/api/assets/upload-simple')
      const simpleData = await simpleRes.json()
      console.log('Simple endpoint status:', simpleData)

      // Check diagnostic endpoint
      const diagRes = await fetch('/api/assets/diagnose')
      const diagData = await diagRes.json()
      console.log('Diagnostic data:', diagData)

      setResult({
        simple: simpleData,
        diagnostic: diagData
      })
    } catch (err) {
      console.error('Check failed:', err)
      setError('Failed to check endpoints')
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload Test Page</h1>
      
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Debug Upload Issues</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select a file to test upload
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <Alert>
              <AlertDescription>
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={testSimpleUpload}
              disabled={!file || uploading}
              variant="default"
            >
              {uploading ? 'Uploading...' : 'Test Simple Upload'}
            </Button>
            
            <Button 
              onClick={testComplexUpload}
              disabled={!file || uploading}
              variant="secondary"
            >
              {uploading ? 'Uploading...' : 'Test Complex Upload'}
            </Button>
            
            <Button 
              onClick={checkEndpoints}
              variant="outline"
            >
              Check Endpoints
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Console Output</h2>
        <p className="text-sm text-gray-600">
          Open browser console (F12) to see detailed logs
        </p>
      </Card>
    </div>
  )
}