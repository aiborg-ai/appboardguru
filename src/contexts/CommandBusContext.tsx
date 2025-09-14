/**
 * CommandBusContext
 * Provides the command bus instance to the application
 */

'use client';

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { CommandBus } from '@/application/cqrs/command-bus';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { registerDocumentHandlers } from '@/application/cqrs/register-document-handlers';
import { DocumentRepositoryImpl } from '@/infrastructure/repositories/document.repository.impl';

export const CommandBusContext = createContext<CommandBus | null>(null);

interface CommandBusProviderProps {
  children: ReactNode;
}

export function CommandBusProvider({ children }: CommandBusProviderProps) {
  const [commandBus] = useState(() => new CommandBus());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize repositories and handlers
    const supabase = createSupabaseBrowserClient();
    
    // Create repositories
    const documentRepository = new DocumentRepositoryImpl(supabase);
    
    // Register handlers
    registerDocumentHandlers(commandBus, documentRepository);
    
    // Mark as initialized
    setIsInitialized(true);
    
    console.log('✅ Command bus initialized with all handlers');
  }, [commandBus]);

  if (!isInitialized) {
    return <div>Initializing application...</div>;
  }

  return (
    <CommandBusContext.Provider value={commandBus}>
      {children}
    </CommandBusContext.Provider>
  );
}