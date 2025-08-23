/**
 * POST /api/ai-meeting/transcription/start
 * 
 * Start a new AI-powered meeting transcription session
 */

import { NextRequest } from 'next/server'
import { AIMeetingAnalysisController } from '../../../../../lib/api/controllers/ai-meeting-analysis.controller'

const controller = new AIMeetingAnalysisController()

/**
 * @swagger
 * /api/ai-meeting/transcription/start:
 *   post:
 *     summary: Start AI-powered meeting transcription
 *     description: Initialize a new meeting transcription session with AI analysis capabilities
 *     tags: [AI Meeting Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [meetingId, organizationId, title, participants]
 *             properties:
 *               meetingId:
 *                 type: string
 *                 format: uuid
 *                 description: Unique identifier for the meeting
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *                 description: Organization ID for context and permissions
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Meeting title or subject
 *               participants:
 *                 type: array
 *                 description: List of meeting participants
 *                 items:
 *                   type: object
 *                   required: [name]
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Participant name
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Participant email (optional)
 *                     role:
 *                       type: string
 *                       description: Participant role (optional)
 *               audioConfig:
 *                 type: object
 *                 description: Audio recording configuration
 *                 properties:
 *                   sampleRate:
 *                     type: number
 *                     minimum: 8000
 *                     maximum: 48000
 *                     default: 44100
 *                   channels:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 2
 *                     default: 2
 *                   format:
 *                     type: string
 *                     enum: [wav, mp3, flac, webm]
 *                     default: wav
 *                   noiseReduction:
 *                     type: boolean
 *                     default: true
 *               expectedLanguages:
 *                 type: array
 *                 description: Expected languages in the meeting
 *                 items:
 *                   type: string
 *           example:
 *             meetingId: "123e4567-e89b-12d3-a456-426614174000"
 *             organizationId: "org-123e4567-e89b-12d3-a456-426614174000"
 *             title: "Q4 Board Review Meeting"
 *             participants:
 *               - name: "John Doe"
 *                 email: "john@example.com"
 *                 role: "Board Chair"
 *               - name: "Jane Smith"
 *                 email: "jane@example.com"
 *                 role: "CEO"
 *             audioConfig:
 *               sampleRate: 44100
 *               channels: 2
 *               format: "wav"
 *               noiseReduction: true
 *             expectedLanguages: ["en", "es"]
 *     responses:
 *       200:
 *         description: Transcription session started successfully
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
 *                     transcriptionId:
 *                       type: string
 *                       format: uuid
 *                       description: Unique identifier for the transcription
 *                     sessionId:
 *                       type: string
 *                       description: Real-time session identifier
 *                     websocketUrl:
 *                       type: string
 *                       format: uri
 *                       description: WebSocket URL for real-time updates
 *                     status:
 *                       type: string
 *                       enum: [initializing, recording, processing, analyzing, completed, failed, archived]
 *                     participants:
 *                       type: array
 *                       description: Speaker profiles created
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           confidence:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 1
 *                 message:
 *                   type: string
 *                   example: "Meeting transcription started successfully"
 *       400:
 *         description: Bad request - invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid meeting ID format"
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to start transcription session"
 */
export async function POST(request: NextRequest) {
  return controller.startTranscription(request)
}