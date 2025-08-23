/**
 * GET /api/ai-meeting/transcription/[id]
 * 
 * Get transcription details with analysis results
 */

import { NextRequest } from 'next/server'
import { AIMeetingAnalysisController } from '../../../../../lib/api/controllers/ai-meeting-analysis.controller'

const controller = new AIMeetingAnalysisController()

/**
 * @swagger
 * /api/ai-meeting/transcription/{id}:
 *   get:
 *     summary: Get meeting transcription
 *     description: Retrieve meeting transcription details with optional segments and AI analysis results
 *     tags: [AI Meeting Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Transcription ID
 *       - in: query
 *         name: includeSegments
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include transcription segments in response
 *       - in: query
 *         name: includeAnalysis
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include AI analysis results in response
 *     responses:
 *       200:
 *         description: Transcription details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     transcription:
 *                       type: object
 *                       description: Core transcription data
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         meetingId:
 *                           type: string
 *                           format: uuid
 *                         organizationId:
 *                           type: string
 *                           format: uuid
 *                         title:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [initializing, recording, processing, analyzing, completed, failed, archived]
 *                         audioConfig:
 *                           type: object
 *                           properties:
 *                             sampleRate:
 *                               type: number
 *                             channels:
 *                               type: number
 *                             format:
 *                               type: string
 *                             noiseReduction:
 *                               type: boolean
 *                         speakers:
 *                           type: array
 *                           description: Speaker profiles
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               role:
 *                                 type: string
 *                               confidence:
 *                                 type: number
 *                         metadata:
 *                           type: object
 *                           description: Meeting metadata
 *                           properties:
 *                             duration:
 *                               type: number
 *                               description: Meeting duration in milliseconds
 *                             wordCount:
 *                               type: number
 *                             speakerCount:
 *                               type: number
 *                             languagesDetected:
 *                               type: array
 *                               items:
 *                                 type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                     segments:
 *                       type: array
 *                       description: Transcription segments (if includeSegments=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           text:
 *                             type: string
 *                           startTime:
 *                             type: number
 *                           endTime:
 *                             type: number
 *                           speakerId:
 *                             type: string
 *                             format: uuid
 *                           confidence:
 *                             type: number
 *                           language:
 *                             type: string
 *                           sentiment:
 *                             type: object
 *                           actionItems:
 *                             type: array
 *                             items:
 *                               type: string
 *                           decisions:
 *                             type: array
 *                             items:
 *                               type: string
 *                     summary:
 *                       type: object
 *                       description: AI-generated summary (if includeAnalysis=true)
 *                       properties:
 *                         executiveSummary:
 *                           type: string
 *                         keyTopics:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               topic:
 *                                 type: string
 *                               category:
 *                                 type: string
 *                               timeSpent:
 *                                 type: number
 *                         confidence:
 *                           type: number
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                     insights:
 *                       type: object
 *                       description: Meeting insights (if includeAnalysis=true)
 *                       properties:
 *                         effectivenessScore:
 *                           type: object
 *                           properties:
 *                             overall:
 *                               type: number
 *                             dimensions:
 *                               type: object
 *                         engagementMetrics:
 *                           type: object
 *                         productivityMetrics:
 *                           type: object
 *                 message:
 *                   type: string
 *                   example: "Transcription retrieved successfully"
 *       400:
 *         description: Bad request - invalid transcription ID format
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Transcription not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return controller.getTranscription(request, context)
}