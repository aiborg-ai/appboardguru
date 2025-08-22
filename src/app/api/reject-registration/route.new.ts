/**
 * POST /api/reject-registration
 * Delegates to AuthController.rejectRegistration
 * 
 * This route maintains Next.js App Router compatibility while using consolidated controller logic
 */

export { rejectRegistration as POST } from '../controllers/auth.controller'