/**
 * GET /api/health
 * Delegates to HealthController.basicHealthCheck
 */

export { basicHealthCheck as GET } from '../controllers/health.controller'