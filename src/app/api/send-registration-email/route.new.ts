/**
 * POST /api/send-registration-email
 * Delegates to AuthController.sendRegistrationEmail
 * 
 * This route maintains Next.js App Router compatibility while using consolidated controller logic
 */

export { sendRegistrationEmail as POST } from '../controllers/auth.controller'