'use client'

import React from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import BoardChatButton from '@/components/boardchat/BoardChatButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Users, Hash, Lock } from 'lucide-react'

export default function BoardChatPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              BoardChat
            </h1>
            <p className="text-gray-600 mt-1">Collaborate with BoardMates and vault members</p>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Direct Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Send private messages to other board members for confidential discussions.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• End-to-end secure messaging</li>
                <li>• File sharing capabilities</li>
                <li>• Read receipts and delivery status</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5 text-green-600" />
                Group Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Create group conversations for team discussions and collaborative work.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Multiple participants</li>
                <li>• Role-based permissions</li>
                <li>• Message threading</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-600" />
                Vault Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Discuss specific vault contents with authorized members only.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Vault-specific access control</li>
                <li>• Document-centric discussions</li>
                <li>• Enhanced privacy settings</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* How to Use */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">How to Use BoardChat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Getting Started</h3>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Click the BoardChat button in the bottom-right corner</li>
                  <li>Browse existing conversations or start a new one</li>
                  <li>Select recipients and begin messaging</li>
                  <li>Use @mentions to notify specific members</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Features</h3>
                <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                  <li>Real-time messaging with delivery confirmations</li>
                  <li>File and image sharing with security controls</li>
                  <li>Message reactions and threading</li>
                  <li>Search through conversation history</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Active Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Conversations</h3>
              <p className="text-gray-600 mb-4">
                Start your first conversation by clicking the BoardChat button below
              </p>
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm text-gray-600">
                  Look for the BoardChat button in the bottom-right corner →
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BoardChat Integration */}
      <BoardChatButton />
    </DashboardLayout>
  )
}