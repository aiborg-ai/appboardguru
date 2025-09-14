/**
 * Register Document Handlers
 * Registers all document-related command and query handlers with the command bus
 */

import { CommandBus } from '@/application/cqrs/command-bus';
import { IDocumentRepository } from '@/application/interfaces/repositories/document.repository.interface';

// Commands
import { CreateDocumentCommand } from './commands/document/create-document.command';
import { 
  ShareDocumentWithUserCommand,
  AddDocumentToVaultCommand 
} from './commands/document/share-document.command';

// Queries
import { 
  GetDocumentByIdQuery,
  GetDocumentAccessLevelQuery 
} from './queries/document/get-document.query';
import {
  ListUserDocumentsQuery,
  ListDocumentsByOrganizationQuery,
  ListDocumentsByVaultQuery,
  ListRecentDocumentsQuery
} from './queries/document/list-documents.query';

// Command Handlers
import { CreateDocumentCommandHandler } from './handlers/document/create-document.handler';
import { 
  ShareDocumentWithUserCommandHandler,
  AddDocumentToVaultCommandHandler 
} from './handlers/document/share-document.handler';

// Query Handlers
import { 
  GetDocumentByIdQueryHandler,
  GetDocumentAccessLevelQueryHandler 
} from './handlers/document/get-document.handler';
import {
  ListUserDocumentsQueryHandler,
  ListDocumentsByOrganizationQueryHandler,
  ListDocumentsByVaultQueryHandler,
  ListRecentDocumentsQueryHandler
} from './handlers/document/list-documents.handler';

export function registerDocumentHandlers(
  commandBus: CommandBus,
  documentRepository: IDocumentRepository
): void {
  // Register Command Handlers
  commandBus.registerCommandHandler(
    'CreateDocumentCommand',
    new CreateDocumentCommandHandler(documentRepository)
  );

  commandBus.registerCommandHandler(
    'ShareDocumentWithUserCommand',
    new ShareDocumentWithUserCommandHandler(documentRepository)
  );

  commandBus.registerCommandHandler(
    'AddDocumentToVaultCommand',
    new AddDocumentToVaultCommandHandler(documentRepository)
  );

  // Register Query Handlers
  commandBus.registerQueryHandler(
    'GetDocumentByIdQuery',
    new GetDocumentByIdQueryHandler(documentRepository)
  );

  commandBus.registerQueryHandler(
    'GetDocumentAccessLevelQuery',
    new GetDocumentAccessLevelQueryHandler(documentRepository)
  );

  commandBus.registerQueryHandler(
    'ListUserDocumentsQuery',
    new ListUserDocumentsQueryHandler(documentRepository)
  );

  commandBus.registerQueryHandler(
    'ListDocumentsByOrganizationQuery',
    new ListDocumentsByOrganizationQueryHandler(documentRepository)
  );

  commandBus.registerQueryHandler(
    'ListDocumentsByVaultQuery',
    new ListDocumentsByVaultQueryHandler(documentRepository)
  );

  commandBus.registerQueryHandler(
    'ListRecentDocumentsQuery',
    new ListRecentDocumentsQueryHandler(documentRepository)
  );

  console.log('✅ Document handlers registered successfully');
}