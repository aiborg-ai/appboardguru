/**
 * DrawingTools Component
 * Drawing tools for PDF annotations
 */

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Separator } from '@/components/atoms/display/separator'
import { 
  Pen,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Eraser,
  Palette,
  Undo2,
  Redo2,
  Save,
  X
} from 'lucide-react'

interface Point {
  x: number
  y: number
}

interface DrawingPath {
  id: string
  points: Point[]
  color: string
  width: number
  tool: 'pen' | 'line' | 'rectangle' | 'circle' | 'arrow'
}

interface DrawingToolsProps {
  onSave: (drawing: DrawingPath[]) => void
  onCancel: () => void
  initialDrawing?: DrawingPath[]
  color?: string
  onColorChange?: (color: string) => void
  className?: string
}

const drawingTools = [
  { id: 'pen', label: 'Pen', icon: Pen },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'arrow', label: 'Arrow', icon: ArrowRight },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'eraser', label: 'Eraser', icon: Eraser }
]

const strokeWidths = [1, 2, 3, 5, 8, 12]
const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
  '#800080', '#008000', '#000080', '#800000'
]

export const DrawingTools = React.memo<DrawingToolsProps>(function DrawingTools({
  onSave,
  onCancel,
  initialDrawing = [],
  color = '#000000',
  onColorChange,
  className
}) {
  const [currentTool, setCurrentTool] = useState<string>('pen')
  const [strokeWidth, setStrokeWidth] = useState<number>(2)
  const [currentColor, setCurrentColor] = useState<string>(color)
  const [paths, setPaths] = useState<DrawingPath[]>(initialDrawing)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [history, setHistory] = useState<DrawingPath[][]>([initialDrawing])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    context.lineCap = 'round'
    context.lineJoin = 'round'
    contextRef.current = context

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // Redraw existing paths
    redrawCanvas()
  }, [paths])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all paths
    paths.forEach((path) => {
      if (path.points.length < 2) return

      context.beginPath()
      context.strokeStyle = path.color
      context.lineWidth = path.width

      if (path.tool === 'pen') {
        // Draw freehand path
        context.moveTo(path.points[0].x, path.points[0].y)
        for (let i = 1; i < path.points.length; i++) {
          context.lineTo(path.points[i].x, path.points[i].y)
        }
        context.stroke()
      } else if (path.tool === 'line') {
        // Draw straight line
        const start = path.points[0]
        const end = path.points[path.points.length - 1]
        context.moveTo(start.x, start.y)
        context.lineTo(end.x, end.y)
        context.stroke()
      } else if (path.tool === 'rectangle') {
        // Draw rectangle
        const start = path.points[0]
        const end = path.points[path.points.length - 1]
        const width = end.x - start.x
        const height = end.y - start.y
        context.strokeRect(start.x, start.y, width, height)
      } else if (path.tool === 'circle') {
        // Draw circle
        const start = path.points[0]
        const end = path.points[path.points.length - 1]
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        )
        context.beginPath()
        context.arc(start.x, start.y, radius, 0, 2 * Math.PI)
        context.stroke()
      }
    })
  }, [paths])

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'text' || currentTool === 'eraser') return

    const point = getMousePos(e)
    setIsDrawing(true)
    setCurrentPath([point])
  }, [currentTool, getMousePos])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const point = getMousePos(e)
    setCurrentPath(prev => [...prev, point])

    // For real-time drawing feedback
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    redrawCanvas()

    // Draw current path preview
    if (currentPath.length > 0) {
      context.beginPath()
      context.strokeStyle = currentColor
      context.lineWidth = strokeWidth

      if (currentTool === 'pen') {
        context.moveTo(currentPath[0].x, currentPath[0].y)
        currentPath.forEach((p, i) => {
          if (i > 0) context.lineTo(p.x, p.y)
        })
        context.lineTo(point.x, point.y)
        context.stroke()
      } else if (currentTool === 'line') {
        context.moveTo(currentPath[0].x, currentPath[0].y)
        context.lineTo(point.x, point.y)
        context.stroke()
      } else if (currentTool === 'rectangle') {
        const start = currentPath[0]
        const width = point.x - start.x
        const height = point.y - start.y
        context.strokeRect(start.x, start.y, width, height)
      } else if (currentTool === 'circle') {
        const start = currentPath[0]
        const radius = Math.sqrt(
          Math.pow(point.x - start.x, 2) + Math.pow(point.y - start.y, 2)
        )
        context.beginPath()
        context.arc(start.x, start.y, radius, 0, 2 * Math.PI)
        context.stroke()
      }
    }
  }, [isDrawing, currentPath, currentTool, currentColor, strokeWidth, getMousePos, redrawCanvas])

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return

    setIsDrawing(false)

    if (currentPath.length > 0) {
      const newPath: DrawingPath = {
        id: Date.now().toString(),
        points: currentPath,
        color: currentColor,
        width: strokeWidth,
        tool: currentTool as DrawingPath['tool']
      }

      const newPaths = [...paths, newPath]
      setPaths(newPaths)
      
      // Update history
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newPaths)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }

    setCurrentPath([])
  }, [isDrawing, currentPath, paths, currentColor, strokeWidth, currentTool, history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setPaths(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setPaths(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  const clear = useCallback(() => {
    setPaths([])
    const newHistory = [...history.slice(0, historyIndex + 1), []]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor)
    onColorChange?.(newColor)
  }

  const handleSave = () => {
    onSave(paths)
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium">Drawing Tools</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawing tools */}
        <div className="flex items-center space-x-2 mb-3">
          {drawingTools.map((tool) => {
            const Icon = tool.icon
            return (
              <Button
                key={tool.id}
                size="sm"
                variant={currentTool === tool.id ? 'default' : 'ghost'}
                onClick={() => setCurrentTool(tool.id)}
                title={tool.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
        </div>

        {/* Colors and stroke width */}
        <div className="flex items-center space-x-4">
          {/* Colors */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium">Color:</span>
            <div className="flex space-x-1">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => handleColorChange(colorOption)}
                  className={cn(
                    'w-6 h-6 rounded border-2 transition-all',
                    currentColor === colorOption 
                      ? 'ring-2 ring-blue-500 ring-offset-1' 
                      : 'hover:ring-1 hover:ring-gray-300'
                  )}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Stroke width */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium">Width:</span>
            <div className="flex space-x-1">
              {strokeWidths.map((width) => (
                <Button
                  key={width}
                  size="sm"
                  variant={strokeWidth === width ? 'default' : 'ghost'}
                  onClick={() => setStrokeWidth(width)}
                  className="w-8 h-8 p-0"
                >
                  <div 
                    className="bg-current rounded-full"
                    style={{ width: Math.min(width * 2, 16), height: Math.min(width * 2, 16) }}
                  />
                </Button>
              ))}
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Undo/Redo */}
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clear}
              className="text-red-500 hover:text-red-700"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-full border border-gray-300 rounded cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </Card>
  )
})

DrawingTools.displayName = 'DrawingTools'