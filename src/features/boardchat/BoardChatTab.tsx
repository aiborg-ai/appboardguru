'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Search,
  Phone,
  Video,
  Info,
  Users,
  Hash,
  Lock,
  MessageCircle,
  User,
  Circle,
  Check,
  CheckCheck,
  Clock,
  Reply,
  Heart,
  ThumbsUp,
  AtSign,
  Pin,
  Archive,
  Trash2,
  Edit,
  Copy,
  Forward,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useBoardChat } from '@/hooks/useBoardChat';
import { useOrganization } from '@/contexts/OrganizationContext';

interface BoardChatTabProps {
  className?: string;
}

type ConversationType = 'direct' | 'group' | 'vault';
type MessageStatus = 'sent' | 'delivered' | 'read';

interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: string;
  };
  unreadCount: number;
  participants: string[];
  isOnline?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    isCurrentUser: boolean;
  };
  content: string;
  timestamp: Date;
  status: MessageStatus;
  reactions?: { emoji: string; users: string[] }[];
  replyTo?: string;
  attachments?: { name: string; size: string; type: string }[];
  edited?: boolean;
  editedAt?: Date;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    type: 'direct',
    name: 'Sarah Chen',
    avatar: '/avatars/sarah.jpg',
    lastMessage: {
      content: 'Thanks for the quarterly report review!',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      sender: 'Sarah Chen'
    },
    unreadCount: 2,
    participants: ['Sarah Chen'],
    isOnline: true,
    isPinned: true
  },
  {
    id: '2',
    type: 'group',
    name: 'Board Executive Committee',
    lastMessage: {
      content: 'Meeting rescheduled to 3 PM tomorrow',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      sender: 'Michael Roberts'
    },
    unreadCount: 0,
    participants: ['Sarah Chen', 'Michael Roberts', 'Emily Johnson', 'David Kim'],
    isPinned: true
  },
  {
    id: '3',
    type: 'vault',
    name: 'Q4 Financial Vault Discussion',
    lastMessage: {
      content: 'New documents uploaded for review',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      sender: 'System'
    },
    unreadCount: 5,
    participants: ['Finance Team', 'Board Members']
  },
  {
    id: '4',
    type: 'direct',
    name: 'Michael Roberts',
    avatar: '/avatars/michael.jpg',
    lastMessage: {
      content: 'Can you review the compliance doc?',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      sender: 'Michael Roberts'
    },
    unreadCount: 0,
    participants: ['Michael Roberts'],
    isOnline: false
  }
];

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    conversationId: '1',
    sender: {
      id: '2',
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      isCurrentUser: false
    },
    content: 'Hi! I just finished reviewing the quarterly report.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    status: 'read',
    reactions: [{ emoji: '👍', users: ['You'] }]
  },
  {
    id: '2',
    conversationId: '1',
    sender: {
      id: '1',
      name: 'You',
      isCurrentUser: true
    },
    content: 'Great! Any concerns we should address?',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    status: 'read'
  },
  {
    id: '3',
    conversationId: '1',
    sender: {
      id: '2',
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      isCurrentUser: false
    },
    content: 'The revenue projections look solid. However, I think we should discuss the increased operational costs in the next meeting.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'delivered',
    attachments: [
      { name: 'Q4_Report_Notes.pdf', size: '2.3 MB', type: 'pdf' }
    ]
  },
  {
    id: '4',
    conversationId: '1',
    sender: {
      id: '2',
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      isCurrentUser: false
    },
    content: 'Thanks for the quarterly report review!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'sent'
  }
];

export function BoardChatTab({ className }: BoardChatTabProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(MOCK_CONVERSATIONS[0]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'vaults'>('all');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentOrganization } = useOrganization();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation, messages]);

  const handleSendMessage = () => {
    if (message.trim() && selectedConversation) {
      // Create new message object
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        conversationId: selectedConversation.id,
        sender: {
          id: '1',
          name: 'You',
          isCurrentUser: true
        },
        content: message.trim(),
        timestamp: new Date(),
        status: 'sent',
        reactions: [],
        attachments: [],
        edited: false
      };
      
      // Add message to state
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation's last message
      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            lastMessage: {
              content: message.trim(),
              timestamp: new Date(),
              sender: 'You'
            },
            unreadCount: 0
          };
        }
        return conv;
      }));
      
      // Clear message input
      setMessage('');
      
      // Simulate message status updates
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
        ));
      }, 500);
      
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
        ));
      }, 1500);
    }
  };

  const getConversationIcon = (type: ConversationType) => {
    switch (type) {
      case 'direct':
        return <User className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      case 'vault':
        return <Lock className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'direct' && conv.type !== 'direct') return false;
    if (activeTab === 'groups' && conv.type !== 'group') return false;
    if (activeTab === 'vaults' && conv.type !== 'vault') return false;
    
    if (searchQuery) {
      return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const conversationMessages = selectedConversation 
    ? messages.filter(msg => msg.conversationId === selectedConversation.id)
    : [];

  return (
    <div className={cn("flex h-full", className)}>
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Search and Tabs */}
        <div className="p-3 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 h-9"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="direct" className="text-xs">Direct</TabsTrigger>
              <TabsTrigger value="groups" className="text-xs">Groups</TabsTrigger>
              <TabsTrigger value="vaults" className="text-xs">Vaults</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                  selectedConversation?.id === conversation.id 
                    ? "bg-blue-50 hover:bg-blue-100" 
                    : "hover:bg-gray-50"
                )}
              >
                <div className="relative">
                  {conversation.type === 'direct' ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback>
                        {conversation.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      conversation.type === 'group' ? "bg-green-100" : "bg-purple-100"
                    )}>
                      {conversation.type === 'group' ? (
                        <Hash className="h-5 w-5 text-green-600" />
                      ) : (
                        <Lock className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                  )}
                  {conversation.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {conversation.name}
                      </span>
                      {conversation.isPinned && (
                        <Pin className="h-3 w-3 text-gray-400" />
                      )}
                      {conversation.isMuted && (
                        <span className="text-xs text-gray-400">🔇</span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                  
                  {conversation.lastMessage && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-600 truncate">
                        {conversation.lastMessage.sender !== 'You' && (
                          <span className="font-medium">{conversation.lastMessage.sender}: </span>
                        )}
                        {conversation.lastMessage.content}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {selectedConversation.type === 'direct' ? (
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedConversation.avatar} />
                    <AvatarFallback>
                      {selectedConversation.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center",
                    selectedConversation.type === 'group' ? "bg-green-100" : "bg-purple-100"
                  )}>
                    {getConversationIcon(selectedConversation.type)}
                  </div>
                )}
                {selectedConversation.isOnline && (
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold">{selectedConversation.name}</h3>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {selectedConversation.type}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {selectedConversation.type === 'direct' && selectedConversation.isOnline && 'Active now'}
                  {selectedConversation.type === 'group' && `${selectedConversation.participants.length} members`}
                  {selectedConversation.type === 'vault' && `${currentOrganization?.name || 'Organization'} Vault`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Info className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin Conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Star className="h-4 w-4 mr-2" />
                    Star Messages
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {conversationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.sender.isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex space-x-2 max-w-[70%]",
                    msg.sender.isCurrentUser && "flex-row-reverse space-x-reverse"
                  )}>
                    {!msg.sender.isCurrentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.sender.avatar} />
                        <AvatarFallback>
                          {msg.sender.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="space-y-1">
                      {!msg.sender.isCurrentUser && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-900">
                            {msg.sender.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className={cn(
                        "rounded-lg px-3 py-2",
                        msg.sender.isCurrentUser 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-100 text-gray-900"
                      )}>
                        <p className="text-sm">{msg.content}</p>
                        
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((attachment, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-center space-x-2 p-2 rounded",
                                  msg.sender.isCurrentUser 
                                    ? "bg-blue-700" 
                                    : "bg-gray-200"
                                )}
                              >
                                <Paperclip className="h-3 w-3" />
                                <span className="text-xs">{attachment.name}</span>
                                <span className="text-xs opacity-70">({attachment.size})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {msg.sender.isCurrentUser && (
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(msg.status)}
                            {msg.edited && (
                              <span className="text-xs text-gray-400">edited</span>
                            )}
                          </div>
                        )}
                        
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex items-center space-x-1">
                            {msg.reactions.map((reaction, idx) => (
                              <div
                                key={idx}
                                className="bg-gray-100 rounded-full px-2 py-0.5 text-xs flex items-center space-x-1"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-gray-600">{reaction.users.length}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConversation.avatar} />
                    <AvatarFallback>
                      {selectedConversation.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-end space-x-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={`Message ${selectedConversation.name}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="resize-none"
                />
              </div>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Smile className="h-4 w-4" />
              </Button>
              
              <Button 
                size="sm" 
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="h-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <button className="hover:text-gray-700 flex items-center space-x-1">
                  <AtSign className="h-3 w-3" />
                  <span>Mention</span>
                </button>
                <button className="hover:text-gray-700 flex items-center space-x-1">
                  <Hash className="h-3 w-3" />
                  <span>Channel</span>
                </button>
              </div>
              <span className="text-xs text-gray-400">
                Press Enter to send • Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
            <p className="text-sm text-gray-500">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}