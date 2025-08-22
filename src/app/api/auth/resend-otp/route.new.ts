/**
 * POST /api/auth/resend-otp
 * Delegates to AuthController.resendOtp
 * 
 * This route maintains Next.js App Router compatibility while using consolidated controller logic
 */

export { resendOtp as POST } from '../../controllers/auth.controller'