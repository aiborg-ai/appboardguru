'use client'

import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { 
  Paperclip, 
  Smile, 
  Send 
} from 'lucide-react'

interface MessageInputProps {
  message: string
  onMessageChange: (message: string) => void
  onSend: () => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onVoiceTranscription: (text: string) => void
  isDisabled?: boolean
  placeholder?: string
}

export const MessageInput = React.memo<MessageInputProps>(function MessageInput({ 
  message, 
  onMessageChange, 
  onSend, 
  onKeyPress, 
  onVoiceTranscription,
  isDisabled = false,
  placeholder = 'Type a message...'
}) {
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onMessageChange(e.target.value)
  }, [onMessageChange])

  const handleVoiceTranscription = useCallback((text: string) => {
    onVoiceTranscription(text)
  }, [onVoiceTranscription])

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSend()
    }
  }, [message, onSend])

  return (
    <div className="p-3 border-t bg-white">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 relative">
          <Input
            placeholder={placeholder}
            value={message}
            onChange={handleMessageChange}
            onKeyPress={onKeyPress}
            className="pr-28"
            disabled={isDisabled}
          />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <VoiceInputButton
              onTranscription={handleVoiceTranscription}
              disabled={isDisabled}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            />
            <Button variant="ghost" size="sm">
              <Smile className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleSend}
              disabled={!message.trim() || isDisabled}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
})

MessageInput.displayName = 'MessageInput'