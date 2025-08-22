/**
 * GET/POST /api/notifications
 * Delegates to NotificationController
 */

export { 
  listNotifications as GET,
  createNotification as POST 
} from '../controllers/notification.controller'