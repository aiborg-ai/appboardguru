'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Share2,
  Maximize2,
  Minimize2,
  Palette,
  Type,
  Highlighter,
  Edit3,
  MessageCircle,
  Eraser,
  Undo,
  Redo,
  Save,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'highlight' | 'note' | 'drawing' | 'text';
  page: number;
  position: { x: number; y: number; width?: number; height?: number };
  content: string;
  color: string;
  author: string;
  timestamp: Date;
  replies?: AnnotationReply[];
}

interface AnnotationReply {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface DocumentViewerProps {
  documentUrl: string;
  documentTitle: string;
  annotations: Annotation[];
  collaborators: Array<{
    id: string;
    name: string;
    avatar?: string;
    isActive: boolean;
    cursorPosition?: { page: number; x: number; y: number };
  }>;
  currentUserId: string;
  onAnnotationCreate: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  onShare?: () => void;
  onDownload?: () => void;
  className?: string;
}

type DrawingTool = 'highlight' | 'note' | 'drawing' | 'text' | 'eraser';

export const TabletDocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  documentTitle,
  annotations,
  collaborators,
  currentUserId,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onShare,
  onDownload,
  className
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [activeTool, setActiveTool] = useState<DrawingTool>('highlight');
  const [toolColor, setToolColor] = useState('#FFD700');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [annotationHistory, setAnnotationHistory] = useState<any[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawingStartPos = useRef<{ x: number; y: number } | null>(null);

  const colors = [
    '#FFD700', // Gold
    '#FF6B6B', // Red  
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8'  // Mint
  ];

  const zoomLevels = [25, 50, 75, 100, 125, 150, 200, 300, 400];

  const handleZoomIn = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex < zoomLevels.length - 1) {
      setZoomLevel(zoomLevels[currentIndex + 1]);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(zoomLevels[currentIndex - 1]);
    }
  }, [zoomLevel]);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Drawing and annotation handlers
  const getCanvasPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: ((clientX - rect.left) / rect.width) * 100, // Percentage
      y: ((clientY - rect.top) / rect.height) * 100   // Percentage
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const position = getCanvasPosition(e);
    if (!position) return;

    drawingStartPos.current = position;
    setIsDrawing(true);

    if (activeTool === 'note') {
      // Create note annotation immediately
      const newAnnotation: Omit<Annotation, 'id' | 'timestamp'> = {
        type: 'note',
        page: currentPage,
        position: { x: position.x, y: position.y },
        content: '', // Will be filled by user input
        color: toolColor,
        author: currentUserId
      };
      onAnnotationCreate(newAnnotation);
    }
  }, [activeTool, currentPage, toolColor, currentUserId, getCanvasPosition, onAnnotationCreate]);

  const continueDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawingStartPos.current) return;
    
    const position = getCanvasPosition(e);
    if (!position) return;

    if (activeTool === 'drawing') {
      // Real-time drawing feedback would go here
      // For now, we'll just track the path
    }
  }, [isDrawing, activeTool, getCanvasPosition]);

  const finishDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawingStartPos.current) return;
    
    const position = getCanvasPosition(e);
    if (!position) return;

    const startPos = drawingStartPos.current;

    if (activeTool === 'highlight') {
      const newAnnotation: Omit<Annotation, 'id' | 'timestamp'> = {
        type: 'highlight',
        page: currentPage,
        position: {
          x: Math.min(startPos.x, position.x),
          y: Math.min(startPos.y, position.y),
          width: Math.abs(position.x - startPos.x),
          height: Math.abs(position.y - startPos.y)
        },
        content: '',
        color: toolColor,
        author: currentUserId
      };
      onAnnotationCreate(newAnnotation);
    } else if (activeTool === 'text') {
      const newAnnotation: Omit<Annotation, 'id' | 'timestamp'> = {
        type: 'text',
        page: currentPage,
        position: { x: position.x, y: position.y },
        content: 'Click to edit text',
        color: toolColor,
        author: currentUserId
      };
      onAnnotationCreate(newAnnotation);
    } else if (activeTool === 'drawing') {
      const newAnnotation: Omit<Annotation, 'id' | 'timestamp'> = {
        type: 'drawing',
        page: currentPage,
        position: {
          x: Math.min(startPos.x, position.x),
          y: Math.min(startPos.y, position.y),
          width: Math.abs(position.x - startPos.x),
          height: Math.abs(position.y - startPos.y)
        },
        content: JSON.stringify([startPos, position]), // Simple line for now
        color: toolColor,
        author: currentUserId
      };
      onAnnotationCreate(newAnnotation);
    }

    setIsDrawing(false);
    drawingStartPos.current = null;
  }, [isDrawing, activeTool, currentPage, toolColor, currentUserId, getCanvasPosition, onAnnotationCreate]);

  // Touch gesture support
  const handlePinchZoom = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      // Implement pinch-to-zoom logic
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      // Scale zoom based on distance (implementation would track initial distance)
    }
  }, []);

  // Toolbar components
  const toolbarContent = (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 border-b">
      {/* Zoom Controls */}
      <div className="flex items-center space-x-1 border-r pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoomLevel <= zoomLevels[0]}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-mono w-12 text-center">{zoomLevel}%</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoomLevel >= zoomLevels[zoomLevels.length - 1]}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Annotation Tools */}
      <div className="flex items-center space-x-1 border-r pr-2">
        {[
          { tool: 'highlight' as DrawingTool, icon: Highlighter, label: 'Highlight' },
          { tool: 'note' as DrawingTool, icon: MessageCircle, label: 'Note' },
          { tool: 'drawing' as DrawingTool, icon: Edit3, label: 'Draw' },
          { tool: 'text' as DrawingTool, icon: Type, label: 'Text' },
          { tool: 'eraser' as DrawingTool, icon: Eraser, label: 'Eraser' }
        ].map(({ tool, icon: Icon, label }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool(tool)}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Color Palette */}
      <div className="flex items-center space-x-1 border-r pr-2">
        <Palette className="h-4 w-4 text-gray-500" />
        <div className="flex space-x-1">
          {colors.map((color) => (
            <button
              key={color}
              className={cn(
                "w-6 h-6 rounded-full border-2 border-white shadow-sm transition-all",
                toolColor === color && "ring-2 ring-blue-500 ring-offset-1"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setToolColor(color)}
            />
          ))}
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center space-x-1 border-r pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRotate}
          title="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant={showAnnotations ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowAnnotations(!showAnnotations)}
          title={showAnnotations ? "Hide annotations" : "Show annotations"}
        >
          {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="sm" onClick={onDownload} title="Download">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onShare} title="Share">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" title="Save annotations">
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="annotations" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-2 mt-2">
          <TabsTrigger value="annotations">Annotations</TabsTrigger>
          <TabsTrigger value="collaborators">People</TabsTrigger>
        </TabsList>

        <TabsContent value="annotations" className="flex-1 overflow-hidden p-2">
          <div className="space-y-2 overflow-y-auto h-full">
            {annotations.filter(a => a.page === currentPage).map((annotation) => (
              <Card 
                key={annotation.id}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  selectedAnnotation === annotation.id && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: annotation.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {annotation.type}
                        </Badge>
                        <span className="text-xs text-gray-500">{annotation.author}</span>
                      </div>
                      {annotation.content && (
                        <p className="text-sm text-gray-700">{annotation.content}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {annotation.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {annotation.replies && annotation.replies.length > 0 && (
                    <div className="mt-2 pl-5 space-y-1">
                      {annotation.replies.map((reply) => (
                        <div key={reply.id} className="text-xs">
                          <span className="font-medium">{reply.author}:</span> {reply.content}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collaborators" className="flex-1 p-2">
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Active Collaborators</div>
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  collaborator.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>
                  {collaborator.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{collaborator.name}</p>
                  <p className="text-xs text-gray-500">
                    {collaborator.isActive ? 'Online' : 'Offline'}
                  </p>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  collaborator.isActive ? "bg-green-500" : "bg-gray-300"
                )} />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className={cn("h-full flex flex-col bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div>
          <h1 className="text-lg font-semibold">{documentTitle}</h1>
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {toolbarContent}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-gray-50">
          {sidebarContent}
        </div>

        {/* Document Viewer */}
        <div className="flex-1 relative overflow-auto bg-gray-100">
          <div 
            className="relative inline-block m-4 bg-white shadow-lg"
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top left'
            }}
          >
            {/* PDF/Document Canvas */}
            <canvas
              ref={canvasRef}
              className="block border"
              width="800"
              height="1000"
              onMouseDown={startDrawing}
              onMouseMove={continueDrawing}
              onMouseUp={finishDrawing}
              onTouchStart={(e) => {
                handlePinchZoom(e);
                startDrawing(e);
              }}
              onTouchMove={(e) => {
                handlePinchZoom(e);
                continueDrawing(e);
              }}
              onTouchEnd={finishDrawing}
              style={{ cursor: `${activeTool}-cursor` }}
            />

            {/* Annotation Overlay */}
            {showAnnotations && (
              <div
                ref={overlayRef}
                className="absolute inset-0 pointer-events-none"
              >
                {annotations
                  .filter(a => a.page === currentPage)
                  .map((annotation) => (
                    <div
                      key={annotation.id}
                      className={cn(
                        "absolute pointer-events-auto cursor-pointer transition-all duration-200",
                        selectedAnnotation === annotation.id && "ring-2 ring-blue-500"
                      )}
                      style={{
                        left: `${annotation.position.x}%`,
                        top: `${annotation.position.y}%`,
                        width: annotation.position.width ? `${annotation.position.width}%` : 'auto',
                        height: annotation.position.height ? `${annotation.position.height}%` : 'auto',
                        backgroundColor: annotation.type === 'highlight' ? annotation.color + '40' : 'transparent'
                      }}
                      onClick={() => setSelectedAnnotation(annotation.id)}
                    >
                      {annotation.type === 'note' && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                             style={{ backgroundColor: annotation.color }}>
                          <MessageCircle className="w-3 h-3" />
                        </div>
                      )}
                      {annotation.type === 'text' && (
                        <div className="px-2 py-1 text-sm font-medium"
                             style={{ color: annotation.color }}>
                          {annotation.content}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Collaborator Cursors */}
            {collaborators
              .filter(c => c.isActive && c.cursorPosition?.page === currentPage)
              .map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="absolute pointer-events-none z-50"
                  style={{
                    left: `${collaborator.cursorPosition!.x}%`,
                    top: `${collaborator.cursorPosition!.y}%`,
                  }}
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute top-4 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                    {collaborator.name}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletDocumentViewer;