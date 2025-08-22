/**
 * PATCH/DELETE /api/notifications/bulk
 * Delegates to NotificationController bulk operations
 */

export { 
  bulkUpdateNotifications as PATCH,
  bulkDeleteNotifications as DELETE
} from '../../controllers/notification.controller'