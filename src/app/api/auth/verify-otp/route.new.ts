/**
 * POST /api/auth/verify-otp
 * Delegates to AuthController.verifyOtp
 * 
 * This route maintains Next.js App Router compatibility while using consolidated controller logic
 */

export { verifyOtp as POST } from '../../controllers/auth.controller'