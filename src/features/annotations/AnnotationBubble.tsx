'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageSquare,
  Highlighter,
  AlertCircle,
  CheckCircle,
  Info,
  Send,
  Palette,
  Type,
  Mic,
  Image as ImageIcon,
  Link,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AnnotationBubbleProps {
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selectedText?: string;
  onSubmit: (comment: string, color: string, type: string, tags?: string[]) => void;
  onCancel: () => void;
}

const ANNOTATION_COLORS = [
  { name: 'Yellow', value: '#FFFF00', emotion: 'highlight' },
  { name: 'Green', value: '#00FF00', emotion: 'success' },
  { name: 'Blue', value: '#0080FF', emotion: 'info' },
  { name: 'Pink', value: '#FF69B4', emotion: 'important' },
  { name: 'Orange', value: '#FFA500', emotion: 'warning' },
  { name: 'Purple', value: '#8A2BE2', emotion: 'question' },
  { name: 'Red', value: '#FF4444', emotion: 'issue' },
  { name: 'Gray', value: '#808080', emotion: 'note' }
];

const ANNOTATION_TYPES = [
  { id: 'comment', label: 'Comment', icon: MessageSquare, description: 'General comment or feedback' },
  { id: 'highlight', label: 'Highlight', icon: Highlighter, description: 'Important text to emphasize' },
  { id: 'question', label: 'Question', icon: AlertCircle, description: 'Ask for clarification' },
  { id: 'approval', label: 'Approval', icon: CheckCircle, description: 'Mark as approved' },
  { id: 'info', label: 'Information', icon: Info, description: 'Additional context' }
];

const QUICK_TAGS = [
  'Important', 'Review', 'Action Required', 'FYI', 'Question', 
  'Approved', 'Needs Revision', 'Confidential', 'Urgent', 'Reference'
];

export default function AnnotationBubble({
  position,
  selectedText,
  onSubmit,
  onCancel
}: AnnotationBubbleProps) {
  const [comment, setComment] = useState('');
  const [selectedColor, setSelectedColor] = useState(ANNOTATION_COLORS[0]);
  const [selectedType, setSelectedType] = useState(ANNOTATION_TYPES[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const bubbleRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [comment, selectedColor, selectedType, selectedTags]);

  const handleSubmit = () => {
    if (!comment.trim() && !selectedText) return;
    
    onSubmit(
      comment.trim(),
      selectedColor.value,
      selectedType.id,
      selectedTags
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Bubble is now positioned by parent container, so no positioning needed here
  const bubbleStyle = {};

  return (
    <AnimatePresence>
      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={bubbleStyle}
        className={cn(
          "bg-white rounded-lg shadow-2xl border min-w-[300px]",
          isExpanded ? "w-[400px]" : "w-[300px]"
        )}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <selectedType.icon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Add Annotation</span>
              {selectedText && (
                <Badge variant="outline" className="text-xs">
                  {selectedText.length} chars
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Text Preview */}
          {selectedText && (
            <div 
              className="text-xs p-2 rounded mb-3 max-h-20 overflow-y-auto"
              style={{ backgroundColor: selectedColor.value + '30' }}
            >
              "{selectedText}"
            </div>
          )}

          {/* Comment Input */}
          <Textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your comment... (optional)"
            className="min-h-[60px] max-h-[120px] text-sm mb-3"
            onFocus={() => setIsExpanded(true)}
          />

          {/* Color Selection */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Color & Emotion
            </label>
            <div className="flex gap-1 flex-wrap">
              {ANNOTATION_COLORS.map((color) => (
                <TooltipProvider key={color.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "w-7 h-7 rounded border-2 transition-all",
                          selectedColor.value === color.value 
                            ? "border-gray-800 scale-110 shadow-md" 
                            : "border-gray-300 hover:border-gray-500"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setSelectedColor(color)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{color.name} - {color.emotion}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Annotation Type */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Type
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {ANNOTATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <TooltipProvider key={type.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "p-2 rounded border transition-all",
                                  selectedType.id === type.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setSelectedType(type)}
                              >
                                <Icon className="h-4 w-4 mx-auto" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">{type.label}</p>
                              <p className="text-xs text-gray-500">{type.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Tags */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Quick Tags
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs transition-all",
                          selectedTags.includes(tag)
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Mic className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Voice note</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <ImageIcon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach image</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Link className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add link</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex-1" />

                  <span className="text-xs text-gray-400">⌘↵ to save</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTags.length} tags
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!comment.trim() && !selectedText}
                className="min-w-[80px]"
              >
                <Send className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}