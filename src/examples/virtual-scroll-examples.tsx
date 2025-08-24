'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Switch } from '@/components/atoms/form/switch'
import { Label } from '@/components/ui/label'

// Import virtual list components
import VirtualScrollList, { VirtualScrollListRef } from '@/components/ui/virtual-scroll-list'
import AssetVirtualList from '@/components/ui/asset-virtual-list'
import NotificationVirtualList from '@/components/ui/notification-virtual-list'
import BoardMateVirtualList from '@/components/ui/boardmate-virtual-list'
import SearchResultsVirtualList from '@/components/ui/search-results-virtual-list'
import CalendarEventsVirtualList from '@/components/ui/calendar-events-virtual-list'
import AnnotationVirtualList from '@/components/ui/annotation-virtual-list'
import VirtualListPerformanceMonitor, { useVirtualListPerformance } from '@/components/ui/virtual-list-performance-monitor'

import { 
  BarChart3, 
  Settings, 
  Download, 
  RefreshCw,
  Clock,
  Users,
  FileText,
  Bell,
  Search,
  Calendar,
  MessageSquare,
  Play,
  Pause
} from 'lucide-react'

// Mock data generators
const generateMockAssets = (count: number) => {
  const categories = ['board-documents', 'financial', 'legal', 'presentations', 'policies']
  const fileTypes = ['pdf', 'docx', 'xlsx', 'pptx', 'txt']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `asset-${i}`,
    title: `Document ${i + 1}`,
    fileName: `document-${i + 1}.${fileTypes[i % fileTypes.length]}`,
    fileType: fileTypes[i % fileTypes.length],
    fileSize: Math.floor(Math.random() * 10000000) + 1000,
    category: categories[i % categories.length],
    folder: `Folder ${Math.floor(i / 10) + 1}`,
    tags: [`tag-${i % 5}`, `category-${i % 3}`],
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    owner: {
      id: `user-${i % 10}`,
      name: `User ${i % 10 + 1}`,
      email: `user${i % 10 + 1}@example.com`
    },
    sharedWith: [],
    downloadCount: Math.floor(Math.random() * 100),
    viewCount: Math.floor(Math.random() * 500),
    isShared: Math.random() > 0.7,
    thumbnail: Math.random() > 0.8 ? `/api/placeholder/100/100` : undefined
  }))
}

const generateMockNotifications = (count: number) => {
  const types = ['meeting', 'chat', 'asset', 'user', 'security', 'reminder', 'system']
  const statuses = ['unread', 'read', 'archived']
  const priorities = ['low', 'medium', 'high', 'critical']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `notification-${i}`,
    title: `Notification ${i + 1}`,
    message: `This is a sample notification message that describes some important event or update. It might be longer for some notifications.`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    action_text: Math.random() > 0.7 ? 'View Details' : null,
    action_url: Math.random() > 0.7 ? `/details/${i}` : null,
    color: null,
    icon: null
  }))
}

const generateMockBoardMates = (count: number) => {
  const statuses = ['active', 'pending_activation', 'suspended']
  const roles = ['chairman', 'vice_chairman', 'ceo', 'cfo', 'independent_director', 'board_member']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `boardmate-${i}`,
    user_id: `user-${i}`,
    organization_id: 'org-1',
    full_name: `BoardMate ${i + 1}`,
    email: `boardmate${i + 1}@example.com`,
    phone: `+1234567${String(i).padStart(3, '0')}`,
    designation: `Position ${i + 1}`,
    company: `Company ${Math.floor(i / 5) + 1}`,
    bio: Math.random() > 0.5 ? `Experienced professional with expertise in various business areas. ${i + 1}` : null,
    profile_image: Math.random() > 0.6 ? `/api/placeholder/150/150` : null,
    location: `City ${i % 10 + 1}, Country`,
    linkedin_url: Math.random() > 0.7 ? `https://linkedin.com/in/boardmate${i + 1}` : null,
    org_status: statuses[i % statuses.length],
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    board_memberships: [{
      id: `membership-${i}`,
      board_id: 'board-1',
      member_role: roles[i % roles.length],
      member_status: 'active',
      start_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      board: {
        id: 'board-1',
        name: 'Main Board',
        type: 'board'
      }
    }]
  }))
}

// Example component demonstrating all virtual list types
export const VirtualScrollExamples: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assets')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCount, setSelectedCount] = useState(100)
  const [autoLoad, setAutoLoad] = useState(false)
  const [enableSelection, setEnableSelection] = useState(false)
  
  // Performance monitoring
  const { enabled: performanceEnabled, setEnabled: setPerformanceEnabled, exportMetrics } = useVirtualListPerformance()
  
  // Data states
  const [assets, setAssets] = useState(() => generateMockAssets(selectedCount))
  const [notifications, setNotifications] = useState(() => generateMockNotifications(selectedCount))
  const [boardmates, setBoardmates] = useState(() => generateMockBoardMates(selectedCount))
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  
  // Selection states
  const [selectedAssets, setSelectedAssets] = useState(new Set<string>())
  const [selectedNotifications, setSelectedNotifications] = useState(new Set<string>())
  const [selectedBoardmates, setSelectedBoardmates] = useState(new Set<string>())
  
  // Refs for programmatic control
  const assetListRef = useRef<VirtualScrollListRef>(null)
  const notificationListRef = useRef<VirtualScrollListRef>(null)
  const boardmateListRef = useRef<VirtualScrollListRef>(null)

  // Auto-load effect
  useEffect(() => {
    if (!autoLoad) return
    
    const interval = setInterval(() => {
      if (activeTab === 'assets') {
        const newAssets = generateMockAssets(10)
        setAssets(prev => [...prev, ...newAssets])
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [autoLoad, activeTab])

  // Regenerate data when count changes
  useEffect(() => {
    setAssets(generateMockAssets(selectedCount))
    setNotifications(generateMockNotifications(selectedCount))
    setBoardmates(generateMockBoardMates(selectedCount))
  }, [selectedCount])

  const loadMore = async () => {
    if (loading) return
    
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newCount = 20
    if (activeTab === 'assets') {
      const newAssets = generateMockAssets(newCount)
      setAssets(prev => [...prev, ...newAssets])
    } else if (activeTab === 'notifications') {
      const newNotifications = generateMockNotifications(newCount)
      setNotifications(prev => [...prev, ...newNotifications])
    } else if (activeTab === 'boardmates') {
      const newBoardmates = generateMockBoardMates(newCount)
      setBoardmates(prev => [...prev, ...newBoardmates])
    }
    
    setLoading(false)
  }

  const handleScrollToTop = () => {
    const refs = {
      assets: assetListRef,
      notifications: notificationListRef,
      boardmates: boardmateListRef
    }
    refs[activeTab as keyof typeof refs]?.current?.scrollToIndex(0)
  }

  const handleScrollToBottom = () => {
    const refs = {
      assets: assetListRef,
      notifications: notificationListRef,
      boardmates: boardmateListRef
    }
    const data = {
      assets: assets,
      notifications: notifications,
      boardmates: boardmates
    }
    const currentData = data[activeTab as keyof typeof data]
    refs[activeTab as keyof typeof refs]?.current?.scrollToIndex(currentData.length - 1)
  }

  const clearSelections = () => {
    setSelectedAssets(new Set())
    setSelectedNotifications(new Set())
    setSelectedBoardmates(new Set())
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Virtual Scrolling Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Data Count Control */}
              <div className="space-y-2">
                <Label>Items Count</Label>
                <select
                  value={selectedCount}
                  onChange={(e) => setSelectedCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value={100}>100 items</option>
                  <option value={500}>500 items</option>
                  <option value={1000}>1,000 items</option>
                  <option value={5000}>5,000 items</option>
                  <option value={10000}>10,000 items</option>
                </select>
              </div>

              {/* Auto Load Toggle */}
              <div className="space-y-2">
                <Label htmlFor="auto-load">Auto Load New Items</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-load"
                    checked={autoLoad}
                    onCheckedChange={setAutoLoad}
                  />
                  <span className="text-sm text-gray-600">
                    {autoLoad ? 'On' : 'Off'}
                  </span>
                </div>
              </div>

              {/* Selection Toggle */}
              <div className="space-y-2">
                <Label htmlFor="enable-selection">Enable Selection</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-selection"
                    checked={enableSelection}
                    onCheckedChange={setEnableSelection}
                  />
                  <span className="text-sm text-gray-600">
                    {enableSelection ? 'On' : 'Off'}
                  </span>
                </div>
              </div>

              {/* Performance Monitor Toggle */}
              <div className="space-y-2">
                <Label htmlFor="performance-monitor">Performance Monitor</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="performance-monitor"
                    checked={performanceEnabled}
                    onCheckedChange={setPerformanceEnabled}
                  />
                  <span className="text-sm text-gray-600">
                    {performanceEnabled ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScrollToTop}
                >
                  Top
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScrollToBottom}
                >
                  Bottom
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelections}
                  disabled={!enableSelection}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportMetrics}
                  disabled={!performanceEnabled}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export Metrics
                </Button>
              </div>
            </div>

            {/* Selection Summary */}
            {enableSelection && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <Badge variant="outline">
                  Assets: {selectedAssets.size} selected
                </Badge>
                <Badge variant="outline">
                  Notifications: {selectedNotifications.size} selected
                </Badge>
                <Badge variant="outline">
                  BoardMates: {selectedBoardmates.size} selected
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Monitor */}
        <VirtualListPerformanceMonitor
          enabled={performanceEnabled}
          onExport={exportMetrics}
          position="top-right"
          showDetailedMetrics={true}
        />

        {/* Virtual List Examples */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b px-6 pt-6">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="assets" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Assets
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="boardmates" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    BoardMates
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="annotations" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Annotations
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="assets" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Asset Virtual List</h3>
                      <Badge variant="outline">{assets.length} items</Badge>
                    </div>
                    <AssetVirtualList
                      ref={assetListRef}
                      assets={assets}
                      height={600}
                      searchTerm={searchTerm}
                      loading={loading}
                      hasMore={hasMore}
                      onLoadMore={loadMore}
                      enableSelection={enableSelection}
                      selectedAssets={selectedAssets}
                      onSelectionChange={setSelectedAssets}
                      onShare={(asset) => console.log('Share asset:', asset.id)}
                      onDownload={(asset) => console.log('Download asset:', asset.id)}
                      onView={(asset) => console.log('View asset:', asset.id)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Notification Virtual List</h3>
                      <Badge variant="outline">{notifications.length} items</Badge>
                    </div>
                    <NotificationVirtualList
                      ref={notificationListRef}
                      notifications={notifications}
                      height={600}
                      searchTerm={searchTerm}
                      loading={loading}
                      hasMore={hasMore}
                      onLoadMore={loadMore}
                      enableSelection={enableSelection}
                      selectedNotifications={selectedNotifications}
                      onSelectionChange={setSelectedNotifications}
                      onNotificationClick={(notification) => console.log('Click notification:', notification.id)}
                      onMarkRead={(id) => console.log('Mark read:', id)}
                      onArchive={(id) => console.log('Archive:', id)}
                      onDelete={(id) => console.log('Delete:', id)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="boardmates" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">BoardMate Virtual List</h3>
                      <Badge variant="outline">{boardmates.length} items</Badge>
                    </div>
                    <BoardMateVirtualList
                      ref={boardmateListRef}
                      boardmates={boardmates}
                      height={600}
                      searchTerm={searchTerm}
                      loading={loading}
                      hasMore={hasMore}
                      onLoadMore={loadMore}
                      enableSelection={enableSelection}
                      selectedBoardmates={selectedBoardmates}
                      onSelectionChange={setSelectedBoardmates}
                      onEdit={(boardmate) => console.log('Edit boardmate:', boardmate.id)}
                      onMessage={(boardmate) => console.log('Message boardmate:', boardmate.id)}
                      onManageAssociations={(boardmate) => console.log('Manage associations:', boardmate.id)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Search Results Virtual List</h3>
                      <Badge variant="outline">Demo results</Badge>
                    </div>
                    <SearchResultsVirtualList
                      results={assets.slice(0, 50).map((asset, i) => ({
                        id: asset.id,
                        title: asset.title,
                        type: 'asset',
                        content: `Content for ${asset.title}`,
                        excerpt: `This is an excerpt for ${asset.title} showing relevant information...`,
                        url: `/assets/${asset.id}`,
                        metadata: {
                          author: asset.owner.name,
                          createdAt: asset.createdAt,
                          category: asset.category,
                          tags: asset.tags,
                          fileType: asset.fileType,
                          fileSize: asset.fileSize,
                          relevanceScore: Math.random()
                        },
                        thumbnail: asset.thumbnail,
                        highlights: [
                          { field: 'title', value: asset.title },
                          { field: 'content', value: 'Highlighted content...' }
                        ]
                      }))}
                      searchTerm={searchTerm}
                      height={600}
                      groupByType={true}
                      onResultClick={(result) => console.log('Click result:', result.id)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="calendar" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Calendar Events Virtual List</h3>
                      <Badge variant="outline">Demo events</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Note: This demonstrates the calendar events virtual list with mock data.
                    </div>
                    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Calendar Events Virtual List</p>
                        <p className="text-sm text-gray-500">Would display calendar events with virtual scrolling</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="annotations" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Annotation Virtual List</h3>
                      <Badge variant="outline">Demo annotations</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Note: This demonstrates the annotation virtual list with mock data.
                    </div>
                    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Annotation Virtual List</p>
                        <p className="text-sm text-gray-500">Would display annotations with threading and reactions</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        {performanceEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
                  <div className="text-sm text-blue-700">Total Items</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">~10-20</div>
                  <div className="text-sm text-green-700">Visible Items</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">60fps</div>
                  <div className="text-sm text-purple-700">Target FPS</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">&lt;16ms</div>
                  <div className="text-sm text-orange-700">Target Render</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default VirtualScrollExamples