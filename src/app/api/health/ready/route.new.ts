/**
 * GET /api/health/ready
 * Delegates to HealthController.readinessCheck
 */

export { readinessCheck as GET } from '../../controllers/health.controller'