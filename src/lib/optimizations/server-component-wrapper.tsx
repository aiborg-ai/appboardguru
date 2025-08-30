/**
 * Server Component Optimization Wrapper
 * Provides patterns for optimizing Server/Client component boundaries
 * Based on Next.js 14 best practices
 */

import { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Pattern 1: Server Component with Client Interactivity
 * Fetches data on server, passes to client for interaction
 */
export function ServerWithClientPattern() {
  return {
    /**
     * Server Component - Data fetching
     */
    ServerComponent: async function<T>({ 
      fetchData,
      ClientComponent,
      fallback 
    }: {
      fetchData: () => Promise<T>;
      ClientComponent: React.ComponentType<{ data: T }>;
      fallback?: ReactNode;
    }) {
      const data = await fetchData();
      
      return (
        <Suspense fallback={fallback || <DefaultSkeleton />}>
          <ClientComponent data={data} />
        </Suspense>
      );
    },

    /**
     * Example usage
     */
    example: `
      // BoardList.tsx (Server Component)
      import { BoardListClient } from './BoardListClient';
      
      export default async function BoardList() {
        const boards = await supabase
          .from('boards')
          .select('*')
          .order('created_at', { ascending: false });
        
        return <BoardListClient boards={boards.data} />;
      }
      
      // BoardListClient.tsx
      'use client';
      
      export function BoardListClient({ boards }) {
        const [selected, setSelected] = useState(null);
        // Interactive logic here
      }
    `
  };
}

/**
 * Pattern 2: Parallel Data Fetching
 * Optimize loading with parallel promises
 */
export async function parallelFetch<T extends Record<string, () => Promise<any>>>(
  fetchers: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(fetchers) as (keyof T)[];
  const promises = keys.map(key => fetchers[key]());
  
  const results = await Promise.allSettled(promises);
  
  const data = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
  
  keys.forEach((key, index) => {
    const result = results[index];
    if (result.status === 'fulfilled') {
      data[key] = result.value;
    } else {
      console.error(`Failed to fetch ${String(key)}:`, result.reason);
      data[key] = null as any;
    }
  });
  
  return data;
}

/**
 * Pattern 3: Streaming with Suspense
 * Stream data progressively to improve perceived performance
 */
export function StreamingPattern() {
  return {
    /**
     * Container with multiple Suspense boundaries
     */
    StreamingContainer: function({ children }: { children: ReactNode }) {
      return (
        <div className="space-y-4">
          <Suspense fallback={<HeaderSkeleton />}>
            <Header />
          </Suspense>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Suspense fallback={<CardSkeleton />}>
              <PrimaryContent />
            </Suspense>
            
            <Suspense fallback={<CardSkeleton />}>
              <SecondaryContent />
            </Suspense>
          </div>
          
          <Suspense fallback={<ListSkeleton />}>
            {children}
          </Suspense>
        </div>
      );
    },

    /**
     * Progressive enhancement example
     */
    example: `
      // app/dashboard/page.tsx
      export default function Dashboard() {
        return (
          <StreamingContainer>
            <Suspense fallback={<StatsSkeleton />}>
              <DashboardStats />
            </Suspense>
            
            <Suspense fallback={<ChartSkeleton />}>
              <DashboardCharts />
            </Suspense>
            
            <Suspense fallback={<TableSkeleton />}>
              <RecentActivity />
            </Suspense>
          </StreamingContainer>
        );
      }
    `
  };
}

/**
 * Pattern 4: Error Boundary with Fallback
 * Graceful error handling at component level
 */
export function ErrorBoundaryPattern({ 
  children,
  fallback,
  onError 
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}) {
  return (
    <ErrorBoundary
      fallback={fallback || <ErrorFallback />}
      onError={onError}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Pattern 5: Optimistic UI Updates
 * Update UI immediately while background sync happens
 */
export function useOptimisticUpdate<T>() {
  return {
    /**
     * Hook for optimistic updates
     */
    useOptimistic: function(
      initialData: T,
      updateFn: (current: T, optimisticValue: Partial<T>) => T
    ) {
      const [optimisticData, setOptimisticData] = useState(initialData);
      const [isPending, setIsPending] = useState(false);
      
      const updateOptimistic = async (
        optimisticValue: Partial<T>,
        serverAction: () => Promise<T>
      ) => {
        setIsPending(true);
        
        // Optimistic update
        setOptimisticData(current => updateFn(current, optimisticValue));
        
        try {
          // Server update
          const serverData = await serverAction();
          setOptimisticData(serverData);
          return { success: true, data: serverData };
        } catch (error) {
          // Revert on error
          setOptimisticData(initialData);
          return { success: false, error };
        } finally {
          setIsPending(false);
        }
      };
      
      return { optimisticData, updateOptimistic, isPending };
    },

    /**
     * Example usage
     */
    example: `
      function BoardCard({ board }) {
        const { optimisticData, updateOptimistic } = useOptimistic(
          board,
          (current, update) => ({ ...current, ...update })
        );
        
        const handleNameChange = async (newName: string) => {
          await updateOptimistic(
            { name: newName },
            async () => {
              const updated = await updateBoard(board.id, { name: newName });
              return updated;
            }
          );
        };
        
        return <div>{optimisticData.name}</div>;
      }
    `
  };
}

/**
 * Pattern 6: Prefetching and Caching
 * Aggressive prefetching for instant navigation
 */
export function PrefetchPattern() {
  return {
    /**
     * Prefetch on hover
     */
    PrefetchLink: function({ href, children }: { href: string; children: ReactNode }) {
      const router = useRouter();
      
      const handleMouseEnter = () => {
        router.prefetch(href);
      };
      
      return (
        <Link 
          href={href} 
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleMouseEnter}
        >
          {children}
        </Link>
      );
    },

    /**
     * Prefetch visible links
     */
    usePrefetchVisible: function(links: string[]) {
      const router = useRouter();
      
      useEffect(() => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const href = entry.target.getAttribute('href');
                if (href) {
                  router.prefetch(href);
                }
              }
            });
          },
          { rootMargin: '100px' }
        );
        
        const elements = links
          .map(href => document.querySelector(`a[href="${href}"]`))
          .filter(Boolean) as Element[];
        
        elements.forEach(el => observer.observe(el));
        
        return () => {
          elements.forEach(el => observer.unobserve(el));
        };
      }, [links, router]);
    }
  };
}

/**
 * Default Skeletons for loading states
 */
function DefaultSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

function HeaderSkeleton() {
  return <div className="h-16 bg-gray-200 rounded animate-pulse" />;
}

function CardSkeleton() {
  return <div className="h-32 bg-gray-200 rounded animate-pulse" />;
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-64 bg-gray-200 rounded animate-pulse" />;
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h2 className="text-red-800 font-semibold">Something went wrong</h2>
      <button 
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        Reload page
      </button>
    </div>
  );
}

// Missing imports for the examples
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Re-export everything
export {
  DefaultSkeleton,
  HeaderSkeleton,
  CardSkeleton,
  ListSkeleton,
  StatsSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ErrorFallback
};