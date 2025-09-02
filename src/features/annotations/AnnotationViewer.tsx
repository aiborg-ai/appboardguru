'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Search,
  Download,
  Share2,
  Settings,
  Maximize2,
  Minimize2,
  MessageSquare,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import DocumentPanel from './DocumentPanel';
import AnnotationsPanel from './AnnotationsPanel';
import { useAnnotationViewerStore } from '@/stores/annotationViewerStore';
import { useAnnotationSync } from '@/hooks/useAnnotationSync';

interface AnnotationViewerProps {
  assetId: string;
  assetUrl: string;
  assetName: string;
  vaultId?: string;
  vaultName?: string;
  organizationId: string;
  currentUserId: string;
  onClose?: () => void;
}

export default function AnnotationViewer({
  assetId,
  assetUrl,
  assetName,
  vaultId,
  vaultName,
  organizationId,
  currentUserId,
  onClose
}: AnnotationViewerProps) {
  // State
  const [panelWidth, setPanelWidth] = useState(30); // Right panel width percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotationIndicators, setShowAnnotationIndicators] = useState(true);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Store
  const {
    annotations,
    selectedAnnotation,
    filters,
    viewMode,
    setSelectedAnnotation,
    setFilters,
    setViewMode,
    loadAnnotations
  } = useAnnotationViewerStore();

  // Real-time sync
  const { connectedUsers, syncAnnotation } = useAnnotationSync({
    assetId,
    organizationId,
    currentUserId
  });

  // Load annotations on mount
  useEffect(() => {
    loadAnnotations(assetId);
  }, [assetId, loadAnnotations]);

  // Handle panel resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;
      
      // Limit panel width between 20% and 50%
      setPanelWidth(Math.min(Math.max(newWidth, 20), 50));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ to toggle panel
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsPanelCollapsed(prev => !prev);
      }
      // Cmd/Ctrl + F for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        // Focus search input in annotations panel
        const searchInput = document.querySelector('[data-annotation-search]') as HTMLInputElement;
        searchInput?.focus();
      }
      // Escape to exit fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Calculate annotation statistics
  const annotationStats = {
    total: annotations.length,
    byMe: annotations.filter(a => a.created_by === currentUserId).length,
    resolved: annotations.filter(a => a.is_resolved).length,
    active: annotations.filter(a => !a.is_resolved).length,
    users: new Set(annotations.map(a => a.created_by)).size
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col h-screen bg-gray-50",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {assetName}
              {vaultName && (
                <Badge variant="outline" className="text-xs">
                  {vaultName}
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {annotationStats.total} annotations
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {annotationStats.users} contributors
              </span>
              {connectedUsers.length > 1 && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {connectedUsers.length} online
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Users */}
          {connectedUsers.length > 0 && (
            <div className="flex -space-x-2 mr-2">
              {connectedUsers.slice(0, 5).map((user, index) => (
                <TooltipProvider key={user.id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div 
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                        style={{ zIndex: connectedUsers.length - index }}
                      >
                        {user.name?.charAt(0) || 'U'}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{user.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">Active now</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {connectedUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{connectedUsers.length - 5}
                </div>
              )}
            </div>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* View Controls */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnnotationIndicators(!showAnnotationIndicators)}
                >
                  {showAnnotationIndicators ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showAnnotationIndicators ? 'Hide' : 'Show'} annotation indicators
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Toggle annotations panel (⌘\)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? 'Exit' : 'Enter'} fullscreen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Panel */}
        <div 
          className="flex-1 relative"
          style={{ width: isPanelCollapsed ? '100%' : `${100 - panelWidth}%` }}
        >
          <DocumentPanel
            assetId={assetId}
            assetUrl={assetUrl}
            annotations={annotations}
            selectedAnnotation={selectedAnnotation}
            showIndicators={showAnnotationIndicators}
            currentUserId={currentUserId}
            onAnnotationClick={setSelectedAnnotation}
            onAnnotationCreate={(annotation) => {
              // Handle new annotation
              syncAnnotation(annotation);
            }}
          />
        </div>

        {/* Resize Handle */}
        {!isPanelCollapsed && (
          <div
            ref={resizeRef}
            className={cn(
              "w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors relative group",
              isResizing && "bg-blue-500"
            )}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-8 flex items-center justify-center">
              <div className="w-1 h-8 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Annotations Panel */}
        <AnimatePresence>
          {!isPanelCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${panelWidth}%`, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white border-l overflow-hidden"
            >
              <AnnotationsPanel
                annotations={annotations}
                selectedAnnotation={selectedAnnotation}
                currentUserId={currentUserId}
                connectedUsers={connectedUsers}
                filters={filters}
                onAnnotationSelect={setSelectedAnnotation}
                onFiltersChange={setFilters}
                onAnnotationReply={(annotationId, reply) => {
                  // Handle reply
                  console.log('Reply to annotation:', annotationId, reply);
                }}
                onAnnotationResolve={(annotationId) => {
                  // Handle resolve
                  console.log('Resolve annotation:', annotationId);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Panel Indicator */}
        {isPanelCollapsed && annotationStats.active > 0 && (
          <motion.div
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2"
          >
            <Button
              onClick={() => setIsPanelCollapsed(false)}
              className="rounded-full shadow-lg"
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {annotationStats.active}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{annotationStats.total} total</span>
          <span className="text-green-600">{annotationStats.active} active</span>
          <span className="text-gray-400">{annotationStats.resolved} resolved</span>
          <span className="text-blue-600">{annotationStats.byMe} by me</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Press ⌘F to search • ⌘\ to toggle panel</span>
        </div>
      </div>
    </div>
  );
}