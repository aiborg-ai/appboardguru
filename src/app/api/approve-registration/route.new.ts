/**
 * POST /api/approve-registration
 * Delegates to AuthController.approveRegistration
 * 
 * This route maintains Next.js App Router compatibility while using consolidated controller logic
 */

export { approveRegistration as POST } from '../controllers/auth.controller'