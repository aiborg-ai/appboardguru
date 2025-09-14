/**
 * useDocumentService Hook
 * React hook for accessing the document service with command bus
 */

import { useMemo } from 'react';
import { DocumentService, getDocumentService } from '@/application/services/document.service';
import { useCommandBus } from '@/hooks/use-command-bus';

export function useDocumentService(): DocumentService {
  const commandBus = useCommandBus();
  
  return useMemo(() => {
    return getDocumentService(commandBus);
  }, [commandBus]);
}