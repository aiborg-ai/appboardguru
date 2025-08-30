import { Card, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            
            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4" />
            
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Create Organization
            </h2>
            
            <p className="text-sm text-gray-600">
              Setting up the organization wizard...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}