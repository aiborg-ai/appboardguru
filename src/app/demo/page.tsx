'use client'

import { useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Input } from '@/features/shared/ui/input'
import { Textarea } from '@/features/shared/ui/textarea'
import { 
  FileText, 
  Upload, 
  Download, 
  Users, 
  Shield, 
  Activity,
  BarChart3,
  Calendar,
  Search,
  Filter,
  Settings,
  Bell,
  User,
  LogOut,
  Play,
  Pause,
  Volume2,
  FileAudio
} from 'lucide-react'

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isPlaying, setIsPlaying] = useState(false)

  // Demo data
  const demoBoards = [
    {
      id: 1,
      title: 'Q4 2024 Board Meeting',
      date: '2024-12-15',
      status: 'ready',
      size: '12.5 MB',
      summary: 'Quarterly financial review, strategic planning discussion, and executive compensation review.',
      audioSummary: true
    },
    {
      id: 2,
      title: 'Annual Strategy Review 2025',
      date: '2024-11-28',
      status: 'processing',
      size: '8.2 MB',
      summary: 'Long-term strategic goals, market analysis, and competitive positioning.',
      audioSummary: false
    },
    {
      id: 3,
      title: 'Risk Management Assessment',
      date: '2024-11-10',
      status: 'ready',
      size: '15.7 MB',
      summary: 'Comprehensive risk assessment covering operational, financial, and regulatory risks.',
      audioSummary: true
    }
  ]

  const demoUsers = [
    { name: 'John Smith', role: 'Director', status: 'approved', company: 'TechCorp Inc.' },
    { name: 'Sarah Johnson', role: 'Admin', status: 'approved', company: 'BoardGuru' },
    { name: 'Michael Brown', role: 'Director', status: 'approved', company: 'InnovateLtd' },
    { name: 'Emily Davis', role: 'Viewer', status: 'pending', company: 'StartupXYZ' }
  ]

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Board Packs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+4 this week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 completing soon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.1 GB</div>
            <p className="text-xs text-muted-foreground">68% of quota</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Board Packs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Board Packs</CardTitle>
          <CardDescription>Your latest uploaded and processed board materials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {demoBoards.map((board) => (
              <div key={board.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">{board.title}</h3>
                    <p className="text-sm text-muted-foreground">{board.date} • {board.size}</p>
                    <p className="text-sm mt-1">{board.summary}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={board.status === 'ready' ? 'default' : 'secondary'}>
                    {board.status}
                  </Badge>
                  {board.audioSummary && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <FileAudio className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderBoardPacks = () => (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Board Pack</CardTitle>
          <CardDescription>Upload PDF, Word, or PowerPoint files for AI processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
            <p className="text-muted-foreground mb-4">Supports PDF, DOCX, PPTX files up to 50MB</p>
            <Button className="mx-auto">
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Board Pack Title</label>
              <Input placeholder="e.g., Q1 2025 Board Meeting" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Meeting Date</label>
              <Input type="date" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <Textarea placeholder="Brief description of the board pack contents..." />
          </div>
          
          <Button className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Upload and Process
          </Button>
        </CardContent>
      </Card>

      {/* Board Packs List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Board Packs</CardTitle>
            <CardDescription>Manage and access your board materials</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {demoBoards.map((board) => (
              <div key={board.id} className="flex items-center justify-between p-6 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <FileText className="h-10 w-10 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-lg">{board.title}</h3>
                    <p className="text-muted-foreground">{board.date} • {board.size}</p>
                    <p className="text-sm mt-2 max-w-md">{board.summary}</p>
                    {board.audioSummary && (
                      <div className="flex items-center mt-2 text-sm text-blue-600">
                        <Volume2 className="h-4 w-4 mr-1" />
                        Audio summary available
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant={board.status === 'ready' ? 'default' : board.status === 'processing' ? 'secondary' : 'destructive'}>
                    {board.status}
                  </Badge>
                  <div className="flex space-x-2">
                    {board.audioSummary && (
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user access and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {demoUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.company}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">{user.role}</Badge>
                  <Badge variant={user.status === 'approved' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/boardguru-logo.svg" 
                alt="BoardGuru" 
                className="h-8 w-auto"
              />
              <Badge variant="secondary" className="ml-3">DEMO MODE</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
                Demo User
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Demo Environment</h3>
                <p className="text-sm text-blue-700">
                  This is a demonstration of BoardGuru's features. No real data is processed or stored.
                  To access the full platform, please complete the registration process.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-4">
              <a
                href="/demo/dashboard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                New Dashboard
              </a>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-1 mb-8 bg-white p-1 rounded-lg border">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'board-packs', label: 'Board Packs', icon: FileText },
            { id: 'users', label: 'Users', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'board-packs' && renderBoardPacks()}
        {activeTab === 'users' && renderUsers()}
      </div>
    </div>
  )
}