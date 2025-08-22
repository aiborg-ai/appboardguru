/**
 * GET/PATCH/DELETE /api/notifications/[id]
 * Delegates to NotificationController
 */

export { 
  getNotification as GET,
  updateNotification as PATCH,
  deleteNotification as DELETE
} from '../../controllers/notification.controller'