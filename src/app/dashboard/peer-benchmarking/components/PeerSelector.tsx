'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  Plus,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Globe,
  Users,
  DollarSign,
  X,
  Check,
  AlertCircle,
  Target,
  ChevronRight
} from 'lucide-react'
import { PeerOrganization } from '../hooks/usePeerBenchmarking'

interface PeerSelectorProps {
  currentPeers?: PeerOrganization[]
  selectedGroup: string
  onGroupChange: (groupId: string) => void
  organizationId?: string
}

const formatMarketCap = (value: number): string => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  return `$${(value / 1e3).toFixed(0)}K`
}

const formatEmployees = (value: number): string => {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

export default function PeerSelector({
  currentPeers = [],
  selectedGroup,
  onGroupChange,
  organizationId
}: PeerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddPeer, setShowAddPeer] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState('all')
  const [selectedSize, setSelectedSize] = useState('all')
  
  // Peer groups (would come from API)
  const peerGroups = [
    { id: 'default', name: 'Default Peer Group', count: 15, quality: 92 },
    { id: 'industry', name: 'Industry Peers', count: 12, quality: 88 },
    { id: 'size', name: 'Size-Based Peers', count: 10, quality: 85 },
    { id: 'aspirational', name: 'Aspirational Peers', count: 8, quality: 90 },
    { id: 'custom1', name: 'Custom Group 1', count: 18, quality: 87 }
  ]
  
  const filteredPeers = currentPeers.filter(peer => {
    const matchesSearch = peer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         peer.ticker?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesIndustry = selectedIndustry === 'all' || peer.industry === selectedIndustry
    const matchesSize = selectedSize === 'all' || 
                       (selectedSize === 'large' && peer.marketCap > 100e9) ||
                       (selectedSize === 'medium' && peer.marketCap >= 10e9 && peer.marketCap <= 100e9) ||
                       (selectedSize === 'small' && peer.marketCap < 10e9)
    
    return matchesSearch && matchesIndustry && matchesSize
  })
  
  const getRelevanceColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 75) return 'text-yellow-600 bg-yellow-50'
    if (score >= 60) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }
  
  const getDataQualityIcon = (quality: number) => {
    if (quality >= 95) return <Check className="h-3 w-3 text-green-600" />
    if (quality >= 85) return <AlertCircle className="h-3 w-3 text-yellow-600" />
    return <X className="h-3 w-3 text-red-600" />
  }
  
  return (
    <div className="space-y-6">
      {/* Peer Group Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Active Peer Group</Label>
          <Dialog open={showAddPeer} onOpenChange={setShowAddPeer}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Peer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Peer Organization</DialogTitle>
                <DialogDescription>
                  Search and add organizations to your peer benchmarking group
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by company name or ticker..."
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  {/* Search results would go here */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 text-center py-8">
                      Start typing to search for organizations...
                    </p>
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {peerGroups.map(group => (
            <Button
              key={group.id}
              variant={selectedGroup === group.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onGroupChange(group.id)}
              className="justify-start"
            >
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{group.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{group.count} peers</span>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {group.quality}%
                  </Badge>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search peers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="Technology">Technology</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Healthcare">Healthcare</SelectItem>
            <SelectItem value="Energy">Energy</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedSize} onValueChange={setSelectedSize}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="large">Large Cap</SelectItem>
            <SelectItem value="medium">Mid Cap</SelectItem>
            <SelectItem value="small">Small Cap</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Peer Organizations List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredPeers.map((peer) => (
            <Card key={peer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-100 rounded">
                        <Building2 className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{peer.name}</h4>
                          {peer.ticker && (
                            <Badge variant="outline" className="text-xs">
                              {peer.ticker}
                            </Badge>
                          )}
                          {peer.isPrimary && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              Primary
                            </Badge>
                          )}
                          {peer.isAspirational && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              <Target className="h-3 w-3 mr-1" />
                              Aspirational
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {peer.industry} • {peer.country}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Market Cap</p>
                        <p className="text-sm font-medium">
                          {formatMarketCap(peer.marketCap)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="text-sm font-medium">
                          {formatMarketCap(peer.revenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Employees</p>
                        <p className="text-sm font-medium">
                          {formatEmployees(peer.employees)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Relevance</p>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getRelevanceColor(peer.relevanceScore)} text-xs`}>
                            {peer.relevanceScore}%
                          </Badge>
                          {getDataQualityIcon(peer.dataQuality)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="ml-4">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {/* AI Suggestions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI-Powered Peer Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Our AI has identified 3 additional organizations that would strengthen your peer benchmarking analysis
          </p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-white">
              <Building2 className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">Enterprise Solutions Corp</span>
              <Badge className="bg-green-100 text-green-700">95% match</Badge>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white">
              <Building2 className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">Global Innovation Ltd</span>
              <Badge className="bg-green-100 text-green-700">92% match</Badge>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white">
              <Building2 className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">Tech Dynamics Inc</span>
              <Badge className="bg-green-100 text-green-700">88% match</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}