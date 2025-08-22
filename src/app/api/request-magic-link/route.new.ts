/**
 * POST /api/request-magic-link
 * Delegates to AuthController.requestMagicLink
 * 
 * This route maintains Next.js App Router compatibility while using consolidated controller logic
 */

export { requestMagicLink as POST } from '../controllers/auth.controller'