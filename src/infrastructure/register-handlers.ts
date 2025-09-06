/**
 * Handler Registration
 * Registers all CQRS command and query handlers with the command bus
 */

import { commandBus } from '@/application/cqrs/command-bus';
import { createSupabaseClient } from '@/lib/supabase-client';
import { eventBus } from '@/01-shared/lib/event-bus';

// Repositories
import { AssetRepositoryImpl } from './repositories/asset.repository.impl';
import { MeetingRepositoryImpl } from './repositories/meeting.repository.impl';
import { OrganizationRepositoryImpl } from './repositories/organization.repository.impl';
import { UserRepositoryImpl } from './repositories/user.repository.impl';
import { BoardRepositoryImpl } from './repositories/board.repository.impl';

// Storage Service
import { StorageServiceImpl } from './storage/storage.service.impl';

// Asset Handlers
import {
  createUploadAssetCommandHandler,
  createDeleteAssetCommandHandler,
  createShareAssetCommandHandler,
  createUpdateAssetCommandHandler
} from '@/application/cqrs/commands/upload-asset.command';

import {
  createGetAssetQueryHandler,
  createListAssetsQueryHandler,
  createSearchAssetsQueryHandler
} from '@/application/cqrs/queries/get-asset.query';

// Meeting Command Handlers
import {
  createScheduleMeetingCommandHandler
} from '@/application/cqrs/commands/schedule-meeting.command';

import {
  createStartMeetingCommandHandler,
  createEndMeetingCommandHandler,
  createCancelMeetingCommandHandler,
  createUpdateAttendeeStatusCommandHandler,
  createAddMeetingMinutesCommandHandler
} from '@/application/cqrs/commands/manage-meeting.command';

// Meeting Query Handlers
import {
  createGetMeetingQueryHandler,
  createListMeetingsQueryHandler,
  createGetMyMeetingsQueryHandler,
  createGetMeetingStatisticsQueryHandler,
  createGetAttendeeStatisticsQueryHandler,
  createCheckMeetingConflictsQueryHandler
} from '@/application/cqrs/queries/get-meeting.query';

// Organization Command Handlers
import {
  createCreateOrganizationCommandHandler
} from '@/application/cqrs/commands/create-organization.command';

import {
  createUpdateOrganizationCommandHandler,
  createAddOrganizationMemberCommandHandler,
  createRemoveOrganizationMemberCommandHandler,
  createUpdateOrganizationSettingsCommandHandler,
  createUpgradeOrganizationPlanCommandHandler
} from '@/application/cqrs/commands/manage-organization.command';

// Organization Query Handlers
import {
  createGetOrganizationQueryHandler,
  createListOrganizationsQueryHandler,
  createGetMyOrganizationsQueryHandler,
  createGetOrganizationStatisticsQueryHandler,
  createGetMemberStatisticsQueryHandler,
  createSearchOrganizationsQueryHandler
} from '@/application/cqrs/queries/get-organization.query';

// User Command Handlers
import {
  createRegisterUserCommandHandler,
  createLoginCommandHandler,
  createRequestPasswordResetCommandHandler,
  createResetPasswordCommandHandler,
  createVerifyEmailCommandHandler
} from '@/application/cqrs/commands/auth.command';

import {
  createUpdateUserCommandHandler,
  createDeleteUserCommandHandler
} from '@/application/cqrs/commands/update-user.command';

// User Query Handlers
import {
  createGetUserQueryHandler,
  createGetCurrentUserQueryHandler,
  createListUsersQueryHandler,
  createSearchUsersQueryHandler,
  createGetUserStatisticsQueryHandler,
  createCheckEmailAvailabilityQueryHandler
} from '@/application/cqrs/queries/get-user.query';

// Board Command Handlers
import {
  createCreateBoardCommandHandler
} from '@/application/cqrs/commands/create-board.command';

import {
  createUpdateBoardCommandHandler,
  createArchiveBoardCommandHandler,
  createAddBoardMemberCommandHandler,
  createRemoveBoardMemberCommandHandler,
  createCreateCommitteeCommandHandler,
  createConductElectionCommandHandler
} from '@/application/cqrs/commands/manage-board.command';

// Board Query Handlers
import {
  createGetBoardQueryHandler,
  createListBoardsQueryHandler,
  createGetMyBoardsQueryHandler,
  createSearchBoardsQueryHandler,
  createGetBoardStatisticsQueryHandler,
  createGetMemberStatisticsQueryHandler as createGetBoardMemberStatisticsQueryHandler,
  createGetBoardCommitteesQueryHandler,
  createGetUpcomingMeetingsQueryHandler
} from '@/application/cqrs/queries/get-board.query';

/**
 * Initialize and register all handlers
 */
export function registerHandlers(): void {
  console.log('[RegisterHandlers] Initializing handler registration...');

  // Initialize Supabase client
  const supabase = createSupabaseClient();

  // Initialize repositories
  const assetRepository = new AssetRepositoryImpl(supabase);
  const storageService = new StorageServiceImpl(supabase);
  const meetingRepository = new MeetingRepositoryImpl(supabase);
  const organizationRepository = new OrganizationRepositoryImpl(supabase);
  const userRepository = new UserRepositoryImpl(supabase);
  const boardRepository = new BoardRepositoryImpl(supabase);

  // Register Asset Command Handlers
  console.log('[RegisterHandlers] Registering Asset handlers...');
  
  const uploadAssetHandler = createUploadAssetCommandHandler({
    assetRepository,
    storageService,
    eventBus
  });
  commandBus.registerCommandHandler('UploadAsset', uploadAssetHandler);

  const deleteAssetHandler = createDeleteAssetCommandHandler({
    assetRepository,
    storageService,
    eventBus
  });
  commandBus.registerCommandHandler('DeleteAsset', deleteAssetHandler);

  const shareAssetHandler = createShareAssetCommandHandler({
    assetRepository,
    eventBus
  });
  commandBus.registerCommandHandler('ShareAsset', shareAssetHandler);

  const updateAssetHandler = createUpdateAssetCommandHandler({
    assetRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpdateAsset', updateAssetHandler);

  // Register Asset Query Handlers
  const getAssetHandler = createGetAssetQueryHandler({ assetRepository });
  commandBus.registerQueryHandler('GetAsset', getAssetHandler);

  const listAssetsHandler = createListAssetsQueryHandler({ assetRepository });
  commandBus.registerQueryHandler('ListAssets', listAssetsHandler);

  const searchAssetsHandler = createSearchAssetsQueryHandler({ assetRepository });
  commandBus.registerQueryHandler('SearchAssets', searchAssetsHandler);

  // Register Meeting Command Handlers
  console.log('[RegisterHandlers] Registering Meeting handlers...');
  
  const scheduleMeetingHandler = createScheduleMeetingCommandHandler({
    meetingRepository,
    eventBus
  });
  commandBus.registerCommandHandler('ScheduleMeeting', scheduleMeetingHandler);

  const startMeetingHandler = createStartMeetingCommandHandler({
    meetingRepository,
    eventBus
  });
  commandBus.registerCommandHandler('StartMeeting', startMeetingHandler);

  const endMeetingHandler = createEndMeetingCommandHandler({
    meetingRepository,
    eventBus
  });
  commandBus.registerCommandHandler('EndMeeting', endMeetingHandler);

  const cancelMeetingHandler = createCancelMeetingCommandHandler({
    meetingRepository,
    eventBus
  });
  commandBus.registerCommandHandler('CancelMeeting', cancelMeetingHandler);

  const updateAttendeeStatusHandler = createUpdateAttendeeStatusCommandHandler({
    meetingRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpdateAttendeeStatus', updateAttendeeStatusHandler);

  const addMeetingMinutesHandler = createAddMeetingMinutesCommandHandler({
    meetingRepository,
    eventBus
  });
  commandBus.registerCommandHandler('AddMeetingMinutes', addMeetingMinutesHandler);

  // Register Meeting Query Handlers
  const getMeetingHandler = createGetMeetingQueryHandler({ meetingRepository });
  commandBus.registerQueryHandler('GetMeeting', getMeetingHandler);

  const listMeetingsHandler = createListMeetingsQueryHandler({ meetingRepository });
  commandBus.registerQueryHandler('ListMeetings', listMeetingsHandler);

  const getMyMeetingsHandler = createGetMyMeetingsQueryHandler({ meetingRepository });
  commandBus.registerQueryHandler('GetMyMeetings', getMyMeetingsHandler);

  const getMeetingStatisticsHandler = createGetMeetingStatisticsQueryHandler({ meetingRepository });
  commandBus.registerQueryHandler('GetMeetingStatistics', getMeetingStatisticsHandler);

  const getAttendeeStatisticsHandler = createGetAttendeeStatisticsQueryHandler({ meetingRepository });
  commandBus.registerQueryHandler('GetAttendeeStatistics', getAttendeeStatisticsHandler);

  const checkMeetingConflictsHandler = createCheckMeetingConflictsQueryHandler({ meetingRepository });
  commandBus.registerQueryHandler('CheckMeetingConflicts', checkMeetingConflictsHandler);

  // Register Organization Command Handlers
  console.log('[RegisterHandlers] Registering Organization handlers...');
  
  const createOrganizationHandler = createCreateOrganizationCommandHandler({
    organizationRepository,
    eventBus
  });
  commandBus.registerCommandHandler('CreateOrganization', createOrganizationHandler);

  const updateOrganizationHandler = createUpdateOrganizationCommandHandler({
    organizationRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpdateOrganization', updateOrganizationHandler);

  const addOrganizationMemberHandler = createAddOrganizationMemberCommandHandler({
    organizationRepository,
    eventBus
  });
  commandBus.registerCommandHandler('AddOrganizationMember', addOrganizationMemberHandler);

  const removeOrganizationMemberHandler = createRemoveOrganizationMemberCommandHandler({
    organizationRepository,
    eventBus
  });
  commandBus.registerCommandHandler('RemoveOrganizationMember', removeOrganizationMemberHandler);

  const updateOrganizationSettingsHandler = createUpdateOrganizationSettingsCommandHandler({
    organizationRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpdateOrganizationSettings', updateOrganizationSettingsHandler);

  const upgradeOrganizationPlanHandler = createUpgradeOrganizationPlanCommandHandler({
    organizationRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpgradeOrganizationPlan', upgradeOrganizationPlanHandler);

  // Register Organization Query Handlers
  const getOrganizationHandler = createGetOrganizationQueryHandler({ organizationRepository });
  commandBus.registerQueryHandler('GetOrganization', getOrganizationHandler);

  const listOrganizationsHandler = createListOrganizationsQueryHandler({ organizationRepository });
  commandBus.registerQueryHandler('ListOrganizations', listOrganizationsHandler);

  const getMyOrganizationsHandler = createGetMyOrganizationsQueryHandler({ organizationRepository });
  commandBus.registerQueryHandler('GetMyOrganizations', getMyOrganizationsHandler);

  const getOrganizationStatisticsHandler = createGetOrganizationStatisticsQueryHandler({ organizationRepository });
  commandBus.registerQueryHandler('GetOrganizationStatistics', getOrganizationStatisticsHandler);

  const getMemberStatisticsHandler = createGetMemberStatisticsQueryHandler({ organizationRepository });
  commandBus.registerQueryHandler('GetMemberStatistics', getMemberStatisticsHandler);

  const searchOrganizationsHandler = createSearchOrganizationsQueryHandler({ organizationRepository });
  commandBus.registerQueryHandler('SearchOrganizations', searchOrganizationsHandler);

  // Register User Command Handlers
  console.log('[RegisterHandlers] Registering User handlers...');
  
  const registerUserHandler = createRegisterUserCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('RegisterUser', registerUserHandler);

  const loginHandler = createLoginCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('Login', loginHandler);

  const requestPasswordResetHandler = createRequestPasswordResetCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('RequestPasswordReset', requestPasswordResetHandler);

  const resetPasswordHandler = createResetPasswordCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('ResetPassword', resetPasswordHandler);

  const verifyEmailHandler = createVerifyEmailCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('VerifyEmail', verifyEmailHandler);

  const updateUserHandler = createUpdateUserCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpdateUser', updateUserHandler);

  const deleteUserHandler = createDeleteUserCommandHandler({
    userRepository,
    eventBus
  });
  commandBus.registerCommandHandler('DeleteUser', deleteUserHandler);

  // Register User Query Handlers
  const getUserHandler = createGetUserQueryHandler({ userRepository });
  commandBus.registerQueryHandler('GetUser', getUserHandler);

  const getCurrentUserHandler = createGetCurrentUserQueryHandler({ userRepository });
  commandBus.registerQueryHandler('GetCurrentUser', getCurrentUserHandler);

  const listUsersHandler = createListUsersQueryHandler({ userRepository });
  commandBus.registerQueryHandler('ListUsers', listUsersHandler);

  const searchUsersHandler = createSearchUsersQueryHandler({ userRepository });
  commandBus.registerQueryHandler('SearchUsers', searchUsersHandler);

  const getUserStatisticsHandler = createGetUserStatisticsQueryHandler({ userRepository });
  commandBus.registerQueryHandler('GetUserStatistics', getUserStatisticsHandler);

  const checkEmailAvailabilityHandler = createCheckEmailAvailabilityQueryHandler({ userRepository });
  commandBus.registerQueryHandler('CheckEmailAvailability', checkEmailAvailabilityHandler);

  // Register Board Command Handlers
  console.log('[RegisterHandlers] Registering Board handlers...');
  
  const createBoardHandler = createCreateBoardCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('CreateBoard', createBoardHandler);

  const updateBoardHandler = createUpdateBoardCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('UpdateBoard', updateBoardHandler);

  const archiveBoardHandler = createArchiveBoardCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('ArchiveBoard', archiveBoardHandler);

  const addBoardMemberHandler = createAddBoardMemberCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('AddBoardMember', addBoardMemberHandler);

  const removeBoardMemberHandler = createRemoveBoardMemberCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('RemoveBoardMember', removeBoardMemberHandler);

  const createCommitteeHandler = createCreateCommitteeCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('CreateCommittee', createCommitteeHandler);

  const conductElectionHandler = createConductElectionCommandHandler({
    boardRepository,
    eventBus
  });
  commandBus.registerCommandHandler('ConductElection', conductElectionHandler);

  // Register Board Query Handlers
  const getBoardHandler = createGetBoardQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('GetBoard', getBoardHandler);

  const listBoardsHandler = createListBoardsQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('ListBoards', listBoardsHandler);

  const getMyBoardsHandler = createGetMyBoardsQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('GetMyBoards', getMyBoardsHandler);

  const searchBoardsHandler = createSearchBoardsQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('SearchBoards', searchBoardsHandler);

  const getBoardStatisticsHandler = createGetBoardStatisticsQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('GetBoardStatistics', getBoardStatisticsHandler);

  const getBoardMemberStatisticsHandler = createGetBoardMemberStatisticsQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('GetBoardMemberStatistics', getBoardMemberStatisticsHandler);

  const getBoardCommitteesHandler = createGetBoardCommitteesQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('GetBoardCommittees', getBoardCommitteesHandler);

  const getUpcomingMeetingsHandler = createGetUpcomingMeetingsQueryHandler({ boardRepository });
  commandBus.registerQueryHandler('GetUpcomingMeetings', getUpcomingMeetingsHandler);

  // Log registration summary
  const counts = commandBus.getHandlerCounts();
  console.log('[RegisterHandlers] Registration complete:', {
    commandHandlers: counts.commands,
    queryHandlers: counts.queries,
    totalHandlers: counts.commands + counts.queries
  });
}

/**
 * Initialize handlers on module load
 * This ensures handlers are registered when the application starts
 */
let handlersRegistered = false;

export function ensureHandlersRegistered(): void {
  if (!handlersRegistered) {
    registerHandlers();
    handlersRegistered = true;
  }
}

// Register handlers immediately if running in Node.js environment
if (typeof window === 'undefined') {
  ensureHandlersRegistered();
}