/**
 * GET /api/health/live
 * Delegates to HealthController.livenessCheck
 */

export { livenessCheck as GET } from '../../controllers/health.controller'