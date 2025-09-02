import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Annotation {
  id: string;
  asset_id: string;
  page_number: number;
  position: {
    x?: number; // Legacy format support
    y?: number;
    width?: number;
    height?: number;
    boundingRect?: {
      x: number;
      y: number;
      width: number;
      height: number;
      pageNumber: number;
    };
    rects?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      pageNumber: number;
    }>;
  };
  content?: {
    text?: string;
  };
  comment_text?: string;
  selected_text?: string;
  color: string;
  opacity: number;
  annotation_type: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_resolved: boolean;
  is_private: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: any[];
  reactions?: { emoji: string; users: string[] }[];
  tags?: string[];
}

interface Filters {
  showOnlyMine: boolean;
  showResolved?: boolean;
  pageNumber?: number;
  userFilter?: string;
  colorFilter?: string;
  typeFilter?: string;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface ViewSettings {
  panelWidth: number;
  isPanelCollapsed: boolean;
  showIndicators: boolean;
  groupBy: 'time' | 'page' | 'user';
  sortBy: 'newest' | 'oldest' | 'mostReplies';
  viewMode: 'list' | 'thread' | 'timeline';
  zoom: number;
  currentPage: number;
}

interface AnnotationViewerState {
  // Annotations data
  annotations: Annotation[];
  selectedAnnotation: string | null;
  hoveredAnnotation: string | null;
  editingAnnotation: string | null;
  
  // Filters
  filters: Filters;
  
  // View settings
  viewSettings: ViewSettings;
  viewMode: 'document' | 'split' | 'annotations';
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isCreatingAnnotation: boolean;
  selectionRect: any | null;
  
  // Real-time collaboration
  connectedUsers: any[];
  typingUsers: Map<string, string>; // userId -> annotationId
  
  // Actions
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  
  setSelectedAnnotation: (id: string | null) => void;
  setHoveredAnnotation: (id: string | null) => void;
  setEditingAnnotation: (id: string | null) => void;
  
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  
  setViewSettings: (settings: Partial<ViewSettings>) => void;
  setViewMode: (mode: 'document' | 'split' | 'annotations') => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Collaboration
  setConnectedUsers: (users: any[]) => void;
  setUserTyping: (userId: string, annotationId: string | null) => void;
  
  // Async actions
  loadAnnotations: (assetId: string) => Promise<void>;
  createAnnotation: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  resolveAnnotation: (id: string) => Promise<void>;
  addReply: (annotationId: string, reply: string) => Promise<void>;
  addReaction: (annotationId: string, emoji: string) => Promise<void>;
}

const defaultFilters: Filters = {
  showOnlyMine: false,
  showResolved: undefined,
  pageNumber: undefined,
  userFilter: undefined,
  colorFilter: undefined,
  typeFilter: undefined,
  searchQuery: undefined,
  dateRange: undefined,
};

const defaultViewSettings: ViewSettings = {
  panelWidth: 30,
  isPanelCollapsed: false,
  showIndicators: true,
  groupBy: 'time',
  sortBy: 'newest',
  viewMode: 'list',
  zoom: 100,
  currentPage: 1,
};

export const useAnnotationViewerStore = create<AnnotationViewerState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        annotations: [],
        selectedAnnotation: null,
        hoveredAnnotation: null,
        editingAnnotation: null,
        
        filters: defaultFilters,
        viewSettings: defaultViewSettings,
        viewMode: 'split',
        
        isLoading: false,
        error: null,
        isCreatingAnnotation: false,
        selectionRect: null,
        
        connectedUsers: [],
        typingUsers: new Map(),
        
        // Actions
        setAnnotations: (annotations) => set({ annotations }),
        
        addAnnotation: (annotation) => 
          set((state) => ({ 
            annotations: [...state.annotations, annotation] 
          })),
        
        updateAnnotation: (id, updates) =>
          set((state) => ({
            annotations: state.annotations.map((ann) =>
              ann.id === id ? { ...ann, ...updates } : ann
            ),
          })),
        
        deleteAnnotation: (id) =>
          set((state) => ({
            annotations: state.annotations.filter((ann) => ann.id !== id),
            selectedAnnotation: state.selectedAnnotation === id ? null : state.selectedAnnotation,
          })),
        
        setSelectedAnnotation: (id) => set({ selectedAnnotation: id }),
        setHoveredAnnotation: (id) => set({ hoveredAnnotation: id }),
        setEditingAnnotation: (id) => set({ editingAnnotation: id }),
        
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),
        
        resetFilters: () => set({ filters: defaultFilters }),
        
        setViewSettings: (settings) =>
          set((state) => ({
            viewSettings: { ...state.viewSettings, ...settings },
          })),
        
        setViewMode: (mode) => set({ viewMode: mode }),
        
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        
        setConnectedUsers: (users) => set({ connectedUsers: users }),
        
        setUserTyping: (userId, annotationId) =>
          set((state) => {
            const typingUsers = new Map(state.typingUsers);
            if (annotationId) {
              typingUsers.set(userId, annotationId);
            } else {
              typingUsers.delete(userId);
            }
            return { typingUsers };
          }),
        
        // Async actions
        loadAnnotations: async (assetId) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await fetch(`/api/assets/${assetId}/annotations`);
            if (!response.ok) {
              throw new Error('Failed to load annotations');
            }
            
            const data = await response.json();
            // The controller returns { success, data: { annotations }, metadata }
            const annotations = data.data?.annotations || data.annotations || [];
            set({ 
              annotations: annotations, 
              isLoading: false 
            });
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load annotations',
              isLoading: false 
            });
          }
        },
        
        createAnnotation: async (annotation) => {
          set({ isCreatingAnnotation: true, error: null });
          
          try {
            console.log('Sending annotation to API:', annotation);
            
            const response = await fetch(`/api/assets/${annotation.asset_id}/annotations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(annotation),
            });
            
            const responseData = await response.json();
            console.log('API response:', responseData);
            
            if (!response.ok) {
              // Log validation errors if present
              if (responseData.details) {
                console.error('Validation errors:', responseData.details);
              }
              throw new Error(responseData.error || 'Failed to create annotation');
            }
            
            // The controller returns { success, data: { annotation }, metadata }
            const newAnnotation = responseData.data?.annotation || responseData.annotation;
            
            if (!newAnnotation) {
              throw new Error('Invalid response format from API');
            }
            
            console.log('New annotation created:', newAnnotation);
            
            set((state) => ({
              annotations: [...state.annotations, newAnnotation],
              isCreatingAnnotation: false,
              selectedAnnotation: newAnnotation.id,
            }));
          } catch (error) {
            console.error('Error creating annotation:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to create annotation',
              isCreatingAnnotation: false,
            });
          }
        },
        
        resolveAnnotation: async (id) => {
          try {
            const response = await fetch(`/api/annotations/${id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ is_resolved: true }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to resolve annotation');
            }
            
            set((state) => ({
              annotations: state.annotations.map((ann) =>
                ann.id === id ? { ...ann, is_resolved: true } : ann
              ),
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to resolve annotation',
            });
          }
        },
        
        addReply: async (annotationId, reply) => {
          try {
            const response = await fetch(`/api/annotations/${annotationId}/replies`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ reply_text: reply }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to add reply');
            }
            
            const data = await response.json();
            
            set((state) => ({
              annotations: state.annotations.map((ann) =>
                ann.id === annotationId
                  ? { ...ann, replies: [...(ann.replies || []), data.reply] }
                  : ann
              ),
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to add reply',
            });
          }
        },
        
        addReaction: async (annotationId, emoji) => {
          try {
            const response = await fetch(`/api/assets/annotations/${annotationId}/reactions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ emoji }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to add reaction');
            }
            
            const data = await response.json();
            
            // Update local state with new reaction
            set((state) => {
              const annotations = state.annotations.map((ann) => {
                if (ann.id !== annotationId) return ann;
                
                const reactions = ann.reactions || [];
                const existingReaction = reactions.find(r => r.emoji === emoji);
                
                if (existingReaction) {
                  // Toggle reaction
                  if (existingReaction.users.includes(data.userId)) {
                    existingReaction.users = existingReaction.users.filter(u => u !== data.userId);
                    if (existingReaction.users.length === 0) {
                      return {
                        ...ann,
                        reactions: reactions.filter(r => r.emoji !== emoji),
                      };
                    }
                  } else {
                    existingReaction.users.push(data.userId);
                  }
                } else {
                  // Add new reaction
                  reactions.push({ emoji, users: [data.userId] });
                }
                
                return { ...ann, reactions };
              });
              
              return { annotations };
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to add reaction',
            });
          }
        },
      }),
      {
        name: 'annotation-viewer-storage',
        partialize: (state) => ({
          filters: state.filters,
          viewSettings: state.viewSettings,
          viewMode: state.viewMode,
        }),
      }
    )
  )
);