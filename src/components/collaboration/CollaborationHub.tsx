/**
 * Collaboration Hub - Integrated Real-Time Collaboration Components
 * Centralized component that combines all collaboration features:
 * collaborative editing, live chat, presence indicators, and notifications
 * 
 * Features:
 * - Unified collaboration experience
 * - Real-time document editing with operational transforms
 * - Live chat and messaging
 * - User presence and status indicators
 * - Real-time notifications
 * - Performance optimized with React.memo
 * - Responsive design for all screen sizes
 */

import React, { useState, useEffect, useCallback, memo } from 'react'
import { CollaborativeTextEditor, CollaborativeTextEditorRef } from './CollaborativeTextEditor'
import { LiveBoardChat } from './LiveBoardChat'
import { useRealTimeNotifications } from '@/lib/notifications/real-time-notifications'
import { useWebSocketCollaboration } from '@/lib/websocket/websocket-client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  MessageSquare,
  Bell,
  FileText,
  Eye,
  EyeOff,
  Settings,
  Maximize2,
  Minimize2,
  Share2,
  Download,
  Save
} from 'lucide-react'

interface CollaborationHubProps {
  documentId: string
  vaultId?: string
  organizationId?: string
  initialContent?: string
  documentName?: string
  allowEdit?: boolean
  allowChat?: boolean
  allowNotifications?: boolean
  className?: string
}

interface ConnectedUser {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'away' | 'busy'
  lastSeen: Date
  isTyping?: boolean
  cursorPosition?: number
}

export const CollaborationHub = memo<CollaborationHubProps>(({
  documentId,
  vaultId,
  organizationId,
  initialContent = '',
  documentName = 'Untitled Document',
  allowEdit = true,
  allowChat = true,
  allowNotifications = true,
  className = ''
}) => {
  const { user } = useAuthStore()
  const { client, isConnected } = useWebSocketCollaboration()
  const { notifications, unreadCount, markAsRead } = useRealTimeNotifications()

  // State
  const [activeTab, setActiveTab] = useState<'editor' | 'chat' | 'notifications'>('editor')
  const [connectedUsers, setConnectedUsers] = useState<Map<string, ConnectedUser>>(new Map())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPresence, setShowPresence] = useState(true)
  const [documentContent, setDocumentContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Refs
  const editorRef = React.useRef<CollaborativeTextEditorRef>(null)

  // Room management
  const roomId = `collab-${documentId}`
  const chatRoomId = `chat-${documentId}`

  // Handle user presence updates
  useEffect(() => {
    if (!client) return

    const handleParticipantJoined = (data: { userId: string; userName: string }) => {
      if (data.userId !== user?.id) {
        setConnectedUsers(prev => new Map(prev.set(data.userId, {
          id: data.userId,
          name: data.userName,
          status: 'online',
          lastSeen: new Date()
        })))
      }
    }

    const handleParticipantLeft = (data: { userId: string }) => {
      setConnectedUsers(prev => {
        const updated = new Map(prev)
        updated.delete(data.userId)
        return updated
      })
    }

    const handlePresenceUpdate = (data: any) => {
      if (data.userId !== user?.id) {
        setConnectedUsers(prev => {
          const updated = new Map(prev)
          const existing = updated.get(data.userId)
          if (existing) {
            updated.set(data.userId, {
              ...existing,
              status: data.status || 'online',
              lastSeen: new Date(),
              isTyping: data.isTyping,
              cursorPosition: data.cursor?.position
            })
          }
          return updated
        })
      }
    }

    client.on('participant_joined', handleParticipantJoined)
    client.on('participant_left', handleParticipantLeft)
    client.on('presence_updated', handlePresenceUpdate)

    return () => {
      client.off('participant_joined', handleParticipantJoined)
      client.off('participant_left', handleParticipantLeft)
      client.off('presence_updated', handlePresenceUpdate)
    }
  }, [client, user])

  // Auto-save functionality
  const handleContentChange = useCallback(async (content: string) => {
    setDocumentContent(content)
    
    if (content !== initialContent) {
      setIsSaving(true)
      try {
        // Simulate save API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save document:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }, [initialContent])

  // Manual save
  const handleSave = useCallback(async () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent()
      await handleContentChange(content)
    }
  }, [handleContentChange])

  // Share document
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: documentName,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      // Show toast notification
    }
  }, [documentName])

  // Export document
  const handleExport = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getContent()
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${documentName}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [documentName])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // File upload handler for chat
  const handleFileUpload = useCallback(async (file: File): Promise<string> => {
    // Simulate file upload
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`/uploads/${file.name}`)
      }, 2000)
    })
  }, [])

  // Render header with presence indicators and controls
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText size={20} />
          <h2 className="text-lg font-semibold">{documentName}</h2>
          {isSaving && (
            <Badge variant="outline" className="text-xs">
              Saving...
            </Badge>
          )}
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Connected
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Disconnected
            </>
          )}
        </div>
      </div>

      {/* Connected users */}
      {showPresence && connectedUsers.size > 0 && (
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted-foreground" />
          <div className="flex items-center -space-x-2">
            {Array.from(connectedUsers.values()).slice(0, 5).map(user => (
              <Avatar key={user.id} className="w-8 h-8 border-2 border-background">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
                {user.status === 'online' && (
                  <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 rounded-full border border-background" />
                )}
              </Avatar>
            ))}
            {connectedUsers.size > 5 && (
              <div className="w-8 h-8 border-2 border-background bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                +{connectedUsers.size - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPresence(!showPresence)}
          title={showPresence ? 'Hide presence' : 'Show presence'}
        >
          {showPresence ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
        
        <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}>
          <Save size={16} />
        </Button>
        
        <Button variant="ghost" size="sm" onClick={handleShare}>
          <Share2 size={16} />
        </Button>
        
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download size={16} />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
      </div>
    </div>
  )

  // Render main collaboration interface
  const renderMainInterface = () => {
    if (isFullscreen) {
      return (
        <div className="flex-1">
          <CollaborativeTextEditor
            ref={editorRef}
            documentId={documentId}
            vaultId={vaultId}
            initialContent={documentContent}
            readOnly={!allowEdit}
            showPresence={showPresence}
            showCursors={showPresence}
            onContentChange={handleContentChange}
            className="h-full"
          />
        </div>
      )
    }

    return (
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Main editor */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <CollaborativeTextEditor
            ref={editorRef}
            documentId={documentId}
            vaultId={vaultId}
            initialContent={documentContent}
            readOnly={!allowEdit}
            showPresence={showPresence}
            showCursors={showPresence}
            onContentChange={handleContentChange}
            className="h-full"
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* Side panel */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              {allowChat && (
                <TabsTrigger value="chat" className="relative">
                  <MessageSquare size={16} className="mr-1" />
                  Chat
                </TabsTrigger>
              )}
              {allowNotifications && (
                <TabsTrigger value="notifications" className="relative">
                  <Bell size={16} className="mr-1" />
                  <span className="mr-1">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 min-w-[20px] px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="settings">
                <Settings size={16} className="mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            {allowChat && (
              <TabsContent value="chat" className="flex-1 m-0">
                <LiveBoardChat
                  roomId={chatRoomId}
                  roomType="vault"
                  roomName={`${documentName} Discussion`}
                  participants={[
                    { id: user?.id || '', name: user?.user_metadata?.name || user?.email || 'You', isOnline: true },
                    ...Array.from(connectedUsers.values()).map(u => ({
                      id: u.id,
                      name: u.name,
                      avatar: u.avatar,
                      isOnline: u.status === 'online'
                    }))
                  ]}
                  allowFileUploads={true}
                  enableReactions={true}
                  enableMentions={true}
                  onFileUpload={handleFileUpload}
                  className="h-full"
                />
              </TabsContent>
            )}

            {allowNotifications && (
              <TabsContent value="notifications" className="flex-1 m-0 p-0">
                <div className="h-full overflow-auto">
                  <div className="p-4 space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bell size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 50).map(notification => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                            notification.readAt ? 'opacity-60' : 'bg-muted/30'
                          }`}
                          onClick={() => {
                            markAsRead(notification.id)
                            if (notification.actionUrl) {
                              window.open(notification.actionUrl, '_blank')
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {notification.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(notification.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {!notification.readAt && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="settings" className="flex-1 m-0 p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Collaboration</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showPresence}
                        onChange={(e) => setShowPresence(e.target.checked)}
                      />
                      Show user presence
                    </label>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Connected Users ({connectedUsers.size})</h3>
                  <div className="space-y-2">
                    {Array.from(connectedUsers.values()).map(user => (
                      <div key={user.id} className="flex items-center gap-2 text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1">{user.name}</span>
                        <Badge variant={user.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                          {user.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-background ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      {renderHeader()}
      {renderMainInterface()}
    </div>
  )
})

CollaborationHub.displayName = 'CollaborationHub'

export type { CollaborationHubProps, ConnectedUser }