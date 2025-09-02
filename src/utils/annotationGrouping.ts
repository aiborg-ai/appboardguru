/**
 * Utility functions for grouping and managing annotation positions
 * to prevent overlapping and improve visual clarity
 */

interface AnnotationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Annotation {
  id: string;
  position: AnnotationPosition;
  page_number: number;
  [key: string]: any;
}

/**
 * Check if two rectangles overlap
 */
function doRectanglesOverlap(rect1: AnnotationPosition, rect2: AnnotationPosition): boolean {
  const overlap = !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
  
  return overlap;
}

/**
 * Calculate the percentage of overlap between two rectangles
 */
function calculateOverlapPercentage(rect1: AnnotationPosition, rect2: AnnotationPosition): number {
  const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  
  const overlapArea = xOverlap * yOverlap;
  const rect1Area = rect1.width * rect1.height;
  const rect2Area = rect2.width * rect2.height;
  const minArea = Math.min(rect1Area, rect2Area);
  
  return minArea > 0 ? (overlapArea / minArea) * 100 : 0;
}

/**
 * Group annotations by their position overlap
 * Annotations that overlap by more than the threshold percentage are grouped together
 */
export function groupAnnotationsByPosition(
  annotations: Annotation[],
  overlapThreshold: number = 30
): Annotation[][] {
  // Add defensive checks
  if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
    return [];
  }
  
  const groups: Annotation[][] = [];
  const processedIds = new Set<string>();
  
  annotations.forEach((annotation) => {
    if (processedIds.has(annotation.id)) return;
    
    const group: Annotation[] = [annotation];
    processedIds.add(annotation.id);
    
    // Find all annotations that overlap with this one
    annotations.forEach((other) => {
      if (processedIds.has(other.id)) return;
      if (annotation.id === other.id) return;
      
      // Check if any annotation in the current group overlaps with 'other'
      const overlapsWithGroup = group.some(groupAnnotation => {
        const overlapPercentage = calculateOverlapPercentage(
          groupAnnotation.position,
          other.position
        );
        return overlapPercentage >= overlapThreshold;
      });
      
      if (overlapsWithGroup) {
        group.push(other);
        processedIds.add(other.id);
      }
    });
    
    groups.push(group);
  });
  
  return groups;
}

/**
 * Calculate optimal positions for stacked annotations
 * Returns adjusted positions that create a cascading effect
 */
export function calculateStackedPositions(
  annotations: Annotation[],
  stackOffset: number = 5
): Array<{ annotation: Annotation; adjustedPosition: AnnotationPosition }> {
  // Add defensive checks
  if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
    return [];
  }
  
  // Sort by creation date or some other criterion
  const sorted = [...annotations].sort((a, b) => {
    // Prefer to sort by created_at if available
    if (a.created_at && b.created_at) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return 0;
  });
  
  return sorted.map((annotation, index) => ({
    annotation,
    adjustedPosition: {
      x: annotation.position.x + (index * stackOffset),
      y: annotation.position.y + (index * stackOffset),
      width: annotation.position.width,
      height: annotation.position.height
    }
  }));
}

/**
 * Detect annotation clusters on a page
 * Returns areas of high annotation density
 */
export function detectAnnotationClusters(
  annotations: Annotation[],
  gridSize: number = 50
): Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
  annotations: Annotation[];
}> {
  // Add defensive checks
  if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
    return [];
  }
  
  // Create a grid map
  const grid = new Map<string, Annotation[]>();
  
  annotations.forEach(annotation => {
    const gridX = Math.floor(annotation.position.x / gridSize);
    const gridY = Math.floor(annotation.position.y / gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(annotation);
  });
  
  // Convert grid to clusters
  const clusters = Array.from(grid.entries())
    .filter(([_, anns]) => anns.length > 1)
    .map(([key, anns]) => {
      const [gridX, gridY] = key.split(',').map(Number);
      
      // Calculate bounding box for all annotations in this grid cell
      const minX = Math.min(...anns.map(a => a.position.x));
      const minY = Math.min(...anns.map(a => a.position.y));
      const maxX = Math.max(...anns.map(a => a.position.x + a.position.width));
      const maxY = Math.max(...anns.map(a => a.position.y + a.position.height));
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        density: anns.length,
        annotations: anns
      };
    });
  
  return clusters.sort((a, b) => b.density - a.density);
}

/**
 * Calculate heat map data for page navigation
 * Returns density information for each page
 */
export function calculatePageHeatMap(
  annotations: Annotation[],
  totalPages: number
): Array<{
  page: number;
  count: number;
  density: 'none' | 'low' | 'medium' | 'high';
  color: string;
}> {
  const pageCounts = new Map<number, number>();
  
  // Count annotations per page
  annotations.forEach(annotation => {
    const count = pageCounts.get(annotation.page_number) || 0;
    pageCounts.set(annotation.page_number, count + 1);
  });
  
  // Calculate max count for normalization
  const maxCount = Math.max(...Array.from(pageCounts.values()), 1);
  
  // Generate heat map data for all pages
  return Array.from({ length: totalPages }, (_, i) => {
    const page = i + 1;
    const count = pageCounts.get(page) || 0;
    const normalizedDensity = count / maxCount;
    
    let density: 'none' | 'low' | 'medium' | 'high';
    let color: string;
    
    if (count === 0) {
      density = 'none';
      color = '#E5E7EB'; // gray-200
    } else if (normalizedDensity <= 0.33) {
      density = 'low';
      color = '#FEF3C7'; // yellow-100
    } else if (normalizedDensity <= 0.66) {
      density = 'medium';
      color = '#FED7AA'; // orange-200
    } else {
      density = 'high';
      color = '#FCA5A5'; // red-300
    }
    
    return { page, count, density, color };
  });
}

/**
 * Smart positioning for new annotations to avoid overlaps
 */
export function findOptimalAnnotationPosition(
  proposedPosition: AnnotationPosition,
  existingAnnotations: Annotation[],
  maxAttempts: number = 10
): AnnotationPosition {
  let currentPosition = { ...proposedPosition };
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const hasOverlap = existingAnnotations.some(existing => 
      doRectanglesOverlap(currentPosition, existing.position)
    );
    
    if (!hasOverlap) {
      return currentPosition;
    }
    
    // Try shifting position slightly
    currentPosition = {
      ...currentPosition,
      x: currentPosition.x + 10,
      y: currentPosition.y + 10
    };
    
    attempts++;
  }
  
  // If no non-overlapping position found, return original
  return proposedPosition;
}

/**
 * Merge overlapping annotations into a single group annotation
 */
export function mergeOverlappingAnnotations(
  annotations: Annotation[]
): Array<{
  id: string;
  position: AnnotationPosition;
  annotations: Annotation[];
  isPrimary: boolean;
}> {
  // Add defensive checks
  if (!annotations || !Array.isArray(annotations)) {
    return [];
  }
  const groups = groupAnnotationsByPosition(annotations);
  
  return groups.map(group => {
    if (group.length === 1) {
      return {
        id: group[0].id,
        position: group[0].position,
        annotations: group,
        isPrimary: true
      };
    }
    
    // Calculate merged bounding box
    const minX = Math.min(...group.map(a => a.position.x));
    const minY = Math.min(...group.map(a => a.position.y));
    const maxX = Math.max(...group.map(a => a.position.x + a.position.width));
    const maxY = Math.max(...group.map(a => a.position.y + a.position.height));
    
    return {
      id: `group-${group.map(a => a.id).join('-')}`,
      position: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      annotations: group,
      isPrimary: false
    };
  });
}