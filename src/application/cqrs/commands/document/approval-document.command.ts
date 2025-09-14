/**
 * Document Approval Commands
 * Commands for document approval workflows
 */

import { Command } from '@/01-shared/types/core.types';
import { DocumentId, UserId } from '@/types/core';

export class SubmitDocumentForApprovalCommand implements Command {
  readonly type = 'SubmitDocumentForApprovalCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      submittedBy: UserId;
      approvers: UserId[];
      deadline?: Date;
      notes?: string;
    }
  ) {}
}

export class ApproveDocumentCommand implements Command {
  readonly type = 'ApproveDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      approvedBy: UserId;
      comments?: string;
      signature?: string;
      conditions?: string[];
    }
  ) {}
}

export class RejectDocumentCommand implements Command {
  readonly type = 'RejectDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      rejectedBy: UserId;
      reason: string;
      allowResubmission?: boolean;
    }
  ) {}
}

export class RequestDocumentChangesCommand implements Command {
  readonly type = 'RequestDocumentChangesCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      requestedBy: UserId;
      changes: string[];
      deadline?: Date;
    }
  ) {}
}

export class DelegateApprovalCommand implements Command {
  readonly type = 'DelegateApprovalCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      delegatedBy: UserId;
      delegatedTo: UserId;
      reason?: string;
    }
  ) {}
}