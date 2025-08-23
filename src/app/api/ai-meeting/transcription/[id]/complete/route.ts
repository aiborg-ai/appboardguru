/**
 * POST /api/ai-meeting/transcription/[id]/complete
 * 
 * Complete transcription and generate comprehensive insights
 */

import { NextRequest } from 'next/server'
import { AIMeetingAnalysisController } from '../../../../../../lib/api/controllers/ai-meeting-analysis.controller'

const controller = new AIMeetingAnalysisController()

/**
 * @swagger
 * /api/ai-meeting/transcription/{id}/complete:
 *   post:
 *     summary: Complete meeting transcription
 *     description: Complete the transcription session and generate comprehensive AI insights
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
 *     responses:
 *       200:
 *         description: Transcription completed and insights generated
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
 *                       description: Updated transcription details
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           enum: [completed]
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                     summary:
 *                       type: object
 *                       description: AI-generated meeting summary
 *                       properties:
 *                         executiveSummary:
 *                           type: string
 *                           description: Brief executive summary
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
 *                           minimum: 0
 *                           maximum: 1
 *                     insights:
 *                       type: object
 *                       description: Meeting effectiveness and engagement metrics
 *                       properties:
 *                         effectiveness:
 *                           type: object
 *                           properties:
 *                             overall:
 *                               type: number
 *                               minimum: 0
 *                               maximum: 100
 *                             dimensions:
 *                               type: object
 *                               properties:
 *                                 clarity:
 *                                   type: number
 *                                 participation:
 *                                   type: number
 *                                 decisiveness:
 *                                   type: number
 *                                 actionOrientation:
 *                                   type: number
 *                                 timeManagement:
 *                                   type: number
 *                                 goalAlignment:
 *                                   type: number
 *                         engagement:
 *                           type: object
 *                           properties:
 *                             averageEngagement:
 *                               type: number
 *                               minimum: 0
 *                               maximum: 100
 *                             participationBalance:
 *                               type: number
 *                               minimum: 0
 *                               maximum: 100
 *                         productivity:
 *                           type: object
 *                           properties:
 *                             decisionsPerHour:
 *                               type: number
 *                             actionItemsPerHour:
 *                               type: number
 *                             timeToDecision:
 *                               type: number
 *                             focusScore:
 *                               type: number
 *                     actionItems:
 *                       type: array
 *                       description: Extracted and processed action items
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           description:
 *                             type: string
 *                           assignee:
 *                             type: string
 *                             description: Assigned person name
 *                           priority:
 *                             type: string
 *                             enum: [critical, high, medium, low]
 *                           status:
 *                             type: string
 *                             enum: [extracted, validated, assigned, in-progress, completed, cancelled, overdue]
 *                           dueDate:
 *                             type: string
 *                             format: date
 *                             description: Due date if specified
 *                 message:
 *                   type: string
 *                   example: "Meeting analysis completed successfully"
 *       400:
 *         description: Bad request - invalid transcription ID
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Transcription not found
 *       409:
 *         description: Conflict - transcription already completed
 *       500:
 *         description: Internal server error
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return controller.completeTranscription(request, context)
}