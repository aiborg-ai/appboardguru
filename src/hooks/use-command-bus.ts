/**
 * useCommandBus Hook
 * React hook for accessing the command bus
 */

import { useContext } from 'react';
import { CommandBusContext } from '@/contexts/CommandBusContext';
import { CommandBus } from '@/application/cqrs/command-bus';

export function useCommandBus(): CommandBus {
  const commandBus = useContext(CommandBusContext);
  
  if (!commandBus) {
    throw new Error('useCommandBus must be used within CommandBusProvider');
  }
  
  return commandBus;
}