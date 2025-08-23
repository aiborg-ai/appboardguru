/**
 * POST /api/ai-meeting/transcription/segment
 * 
 * Process a new transcription segment with AI analysis
 */

import { NextRequest } from 'next/server'
import { AIMeetingAnalysisController } from '../../../../../lib/api/controllers/ai-meeting-analysis.controller'

const controller = new AIMeetingAnalysisController()

/**
 * @swagger
 * /api/ai-meeting/transcription/segment:
 *   post:
 *     summary: Process transcription segment
 *     description: Process a new transcription segment with AI analysis for action items, decisions, and sentiment
 *     tags: [AI Meeting Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transcriptionId, text, startTime, endTime, confidence]
 *             properties:
 *               transcriptionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the transcription session
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 description: Transcribed text content
 *               startTime:
 *                 type: number
 *                 minimum: 0
 *                 description: Segment start time in milliseconds
 *               endTime:
 *                 type: number
 *                 minimum: 0
 *                 description: Segment end time in milliseconds
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Transcription confidence score
 *               detectedLanguage:
 *                 type: string
 *                 description: Detected language code (e.g., 'en', 'es')
 *                 default: 'en'
 *           example:
 *             transcriptionId: "trans-123e4567-e89b-12d3-a456-426614174000"
 *             text: "I think we should approve the budget increase for Q4 and assign John to prepare the implementation plan."
 *             startTime: 45000
 *             endTime: 52000
 *             confidence: 0.94
 *             detectedLanguage: "en"
 *     responses:
 *       200:
 *         description: Segment processed successfully
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
 *                     segmentId:
 *                       type: string
 *                       format: uuid
 *                       description: Unique identifier for the segment
 *                     speakerId:
 *                       type: string
 *                       format: uuid
 *                       description: Identified speaker ID (if available)
 *                     actionItems:
 *                       type: array
 *                       description: Extracted action items
 *                       items:
 *                         type: string
 *                       example: ["John to prepare implementation plan"]
 *                     decisions:
 *                       type: array
 *                       description: Identified decisions
 *                       items:
 *                         type: string
 *                       example: ["Approve budget increase for Q4"]
 *                     sentiment:
 *                       type: object
 *                       description: Sentiment analysis results
 *                       properties:
 *                         polarity:
 *                           type: number
 *                           minimum: -1
 *                           maximum: 1
 *                           description: Sentiment polarity (-1 negative, 1 positive)
 *                         magnitude:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 1
 *                           description: Sentiment magnitude (intensity)
 *                         category:
 *                           type: string
 *                           enum: [very-positive, positive, neutral, negative, very-negative, mixed]
 *                         confidence:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 1
 *                     processing:
 *                       type: object
 *                       description: Processing status for different AI analyses
 *                       properties:
 *                         transcribed:
 *                           type: boolean
 *                         speakerIdentified:
 *                           type: boolean
 *                         sentimentAnalyzed:
 *                           type: boolean
 *                         topicExtracted:
 *                           type: boolean
 *                         actionItemsExtracted:
 *                           type: boolean
 *                         decisionsExtracted:
 *                           type: boolean
 *                 message:
 *                   type: string
 *                   example: "Segment processed successfully"
 *       400:
 *         description: Bad request - invalid segment data
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Transcription not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  return controller.processSegment(request)
}