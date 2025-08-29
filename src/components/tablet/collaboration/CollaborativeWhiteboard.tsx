'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pen,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  Image,
  Undo,
  Redo,
  Save,
  Share2,
  Download,
  Users,
  Palette,
  Settings,
  Grid3X3,
  Move,
  RotateCw,
  Copy,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';

interface DrawingElement {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'image';
  points: Array<{ x: number; y: number }>;
  style: {
    color: string;
    thickness: number;
    fill?: string;
    opacity?: number;
  };
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string; // For text elements
  author: string;
  timestamp: Date;
  locked?: boolean;
}

interface Cursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
  tool?: string;
}

interface CollaborativeWhiteboardProps {
  meetingId: string;
  currentUserId: string;
  collaborators: Array<{
    id: string;
    name: string;
    avatar?: string;
    color: string;
    isActive: boolean;
  }>;
  onElementCreate: (element: Omit<DrawingElement, 'id' | 'timestamp'>) => void;
  onElementUpdate: (id: string, updates: Partial<DrawingElement>) => void;
  onElementDelete: (id: string) => void;
  onCursorMove: (cursor: Cursor) => void;
  initialElements?: DrawingElement[];
  className?: string;
}

type DrawingTool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'select' | 'move';

export const CollaborativeWhiteboard: React.FC<CollaborativeWhiteboardProps> = ({
  meetingId,
  currentUserId,
  collaborators,
  onElementCreate,
  onElementUpdate,
  onElementDelete,
  onCursorMove,
  initialElements = [],
  className
}) => {
  const [elements, setElements] = useState<DrawingElement[]>(initialElements);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [toolStyle, setToolStyle] = useState({
    color: '#000000',
    thickness: 2,
    opacity: 1
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#008000', '#FFC0CB', '#A52A2A'
  ];

  const thicknesses = [1, 2, 4, 8, 12, 16];

  // Canvas utilities
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const addToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...elements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [elements, history, historyIndex]);

  // Drawing handlers
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = getCanvasPoint(e);
    if (!point) return;

    drawingStartRef.current = point;
    setIsDrawing(true);

    if (activeTool === 'pen') {
      setCurrentPath([point]);
    } else if (activeTool === 'text') {
      // Create text element immediately
      const newElement: Omit<DrawingElement, 'id' | 'timestamp'> = {
        type: 'text',
        points: [point],
        style: toolStyle,
        content: '',
        author: currentUserId
      };
      onElementCreate(newElement);
    }

    // Update cursor position
    onCursorMove({
      userId: currentUserId,
      userName: collaborators.find(c => c.id === currentUserId)?.name || 'Unknown',
      x: point.x,
      y: point.y,
      color: collaborators.find(c => c.id === currentUserId)?.color || '#000000',
      tool: activeTool
    });
  }, [activeTool, toolStyle, currentUserId, collaborators, getCanvasPoint, onElementCreate, onCursorMove]);

  const continueDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const point = getCanvasPoint(e);
    if (!point || !drawingStartRef.current) return;

    if (activeTool === 'pen') {
      setCurrentPath(prev => [...prev, point]);
    }

    // Update cursor position
    onCursorMove({
      userId: currentUserId,
      userName: collaborators.find(c => c.id === currentUserId)?.name || 'Unknown',
      x: point.x,
      y: point.y,
      color: collaborators.find(c => c.id === currentUserId)?.color || '#000000',
      tool: activeTool
    });
  }, [isDrawing, activeTool, currentUserId, collaborators, getCanvasPoint, onCursorMove]);

  const finishDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawingStartRef.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    const startPoint = drawingStartRef.current;

    let newElement: Omit<DrawingElement, 'id' | 'timestamp'> | null = null;

    switch (activeTool) {
      case 'pen':
        if (currentPath.length > 0) {
          newElement = {
            type: 'path',
            points: [...currentPath, point],
            style: toolStyle,
            author: currentUserId
          };
        }
        break;

      case 'rectangle':
        newElement = {
          type: 'rectangle',
          points: [startPoint, point],
          style: toolStyle,
          bounds: {
            x: Math.min(startPoint.x, point.x),
            y: Math.min(startPoint.y, point.y),
            width: Math.abs(point.x - startPoint.x),
            height: Math.abs(point.y - startPoint.y)
          },
          author: currentUserId
        };
        break;

      case 'circle':
        const radius = Math.sqrt(
          Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)
        );
        newElement = {
          type: 'circle',
          points: [startPoint],
          style: toolStyle,
          bounds: {
            x: startPoint.x - radius,
            y: startPoint.y - radius,
            width: radius * 2,
            height: radius * 2
          },
          author: currentUserId
        };
        break;

      case 'arrow':
        newElement = {
          type: 'arrow',
          points: [startPoint, point],
          style: toolStyle,
          author: currentUserId
        };
        break;
    }

    if (newElement) {
      onElementCreate(newElement);
      addToHistory();
    }

    setIsDrawing(false);
    setCurrentPath([]);
    drawingStartRef.current = null;
  }, [isDrawing, activeTool, currentPath, toolStyle, currentUserId, getCanvasPoint, onElementCreate, addToHistory]);

  // Render canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlay.getContext('2d');
    if (!ctx || !overlayCtx) return;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      const gridSize = 20;
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw elements
    elements.forEach((element) => {
      ctx.strokeStyle = element.style.color;
      ctx.lineWidth = element.style.thickness;
      ctx.globalAlpha = element.style.opacity || 1;

      switch (element.type) {
        case 'path':
          if (element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            element.points.slice(1).forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (element.bounds) {
            ctx.strokeRect(element.bounds.x, element.bounds.y, element.bounds.width, element.bounds.height);
            if (element.style.fill) {
              ctx.fillStyle = element.style.fill;
              ctx.fillRect(element.bounds.x, element.bounds.y, element.bounds.width, element.bounds.height);
            }
          }
          break;

        case 'circle':
          if (element.bounds) {
            const centerX = element.bounds.x + element.bounds.width / 2;
            const centerY = element.bounds.y + element.bounds.height / 2;
            const radius = element.bounds.width / 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            if (element.style.fill) {
              ctx.fillStyle = element.style.fill;
              ctx.fill();
            }
          }
          break;

        case 'arrow':
          if (element.points.length >= 2) {
            const start = element.points[0];
            const end = element.points[1];
            
            // Draw line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw arrowhead
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6;
            
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle - arrowAngle),
              end.y - arrowLength * Math.sin(angle - arrowAngle)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle + arrowAngle),
              end.y - arrowLength * Math.sin(angle + arrowAngle)
            );
            ctx.stroke();
          }
          break;

        case 'text':
          if (element.content && element.points.length > 0) {
            ctx.fillStyle = element.style.color;
            ctx.font = `${element.style.thickness * 8}px Arial`;
            ctx.fillText(element.content, element.points[0].x, element.points[0].y);
          }
          break;
      }
    });

    // Draw current path if drawing
    if (isDrawing && currentPath.length > 0 && activeTool === 'pen') {
      overlayCtx.strokeStyle = toolStyle.color;
      overlayCtx.lineWidth = toolStyle.thickness;
      overlayCtx.globalAlpha = toolStyle.opacity;
      
      overlayCtx.beginPath();
      overlayCtx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.slice(1).forEach(point => {
        overlayCtx.lineTo(point.x, point.y);
      });
      overlayCtx.stroke();
    }

    // Draw collaborator cursors
    cursors.forEach((cursor, userId) => {
      if (userId !== currentUserId) {
        overlayCtx.fillStyle = cursor.color;
        overlayCtx.beginPath();
        overlayCtx.arc(cursor.x, cursor.y, 5, 0, 2 * Math.PI);
        overlayCtx.fill();
        
        // Draw cursor label
        overlayCtx.fillStyle = 'white';
        overlayCtx.fillRect(cursor.x + 10, cursor.y - 15, cursor.userName.length * 8, 20);
        overlayCtx.fillStyle = cursor.color;
        overlayCtx.font = '12px Arial';
        overlayCtx.fillText(cursor.userName, cursor.x + 12, cursor.y);
      }
    });

    ctx.globalAlpha = 1;
    overlayCtx.globalAlpha = 1;
  }, [elements, showGrid, isDrawing, currentPath, activeTool, toolStyle, cursors, currentUserId]);

  // Effects
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    setElements(initialElements);
  }, [initialElements]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const clearCanvas = useCallback(() => {
    setElements([]);
    addToHistory();
  }, [addToHistory]);

  const tools = [
    { id: 'pen' as DrawingTool, icon: Pen, label: 'Pen' },
    { id: 'eraser' as DrawingTool, icon: Eraser, label: 'Eraser' },
    { id: 'rectangle' as DrawingTool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as DrawingTool, icon: Circle, label: 'Circle' },
    { id: 'arrow' as DrawingTool, icon: ArrowRight, label: 'Arrow' },
    { id: 'text' as DrawingTool, icon: Type, label: 'Text' },
    { id: 'select' as DrawingTool, icon: Move, label: 'Select' }
  ];

  return (
    <div ref={containerRef} className={cn("h-full flex flex-col bg-white", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        {/* Drawing Tools */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border-r pr-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTool(tool.id)}
                  title={tool.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>

          {/* Color Palette */}
          <div className="flex items-center space-x-1 border-r pr-3">
            <Palette className="h-4 w-4 text-gray-500" />
            <div className="flex space-x-1">
              {colors.slice(0, 6).map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-6 h-6 rounded border-2 transition-all",
                    toolStyle.color === color ? "border-blue-500 scale-110" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setToolStyle(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          {/* Thickness */}
          <div className="flex items-center space-x-2 border-r pr-3">
            <span className="text-sm text-gray-500">Size:</span>
            <div className="flex space-x-1">
              {thicknesses.slice(0, 4).map((thickness) => (
                <button
                  key={thickness}
                  className={cn(
                    "w-6 h-6 rounded border flex items-center justify-center transition-all",
                    toolStyle.thickness === thickness ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  )}
                  onClick={() => setToolStyle(prev => ({ ...prev, thickness }))}
                >
                  <div 
                    className="rounded-full bg-current"
                    style={{ 
                      width: `${Math.max(2, thickness)}px`, 
                      height: `${Math.max(2, thickness)}px` 
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? "Hide grid" : "Show grid"}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            title="Clear canvas"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Save"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={continueDrawing}
          onMouseUp={finishDrawing}
          onTouchStart={startDrawing}
          onTouchMove={continueDrawing}
          onTouchEnd={finishDrawing}
        />
        <canvas
          ref={overlayRef}
          width={1200}
          height={800}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Collaborators Panel */}
      <div className="border-t bg-gray-50 p-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Collaborators:</span>
          </div>
          <div className="flex space-x-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center space-x-2 px-2 py-1 bg-white rounded-full border"
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full",
                    collaborator.isActive ? "animate-pulse" : "opacity-50"
                  )}
                  style={{ backgroundColor: collaborator.color }}
                />
                <span className="text-xs font-medium">{collaborator.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeWhiteboard;