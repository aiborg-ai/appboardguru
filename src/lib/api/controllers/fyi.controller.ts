import { NextRequest, NextResponse } from 'next/server'
import { FYIService } from '../../services/fyi.service'
import { createSupabaseServerClient } from '../../supabase-server'
import type { FYIContext } from '../../../types/fyi'

export class FYIController {
  private async getFYIService() {
    const supabase = await createSupabaseServerClient()
    return new FYIService(supabase, {
      newsApiKey: process.env['NEWS_API_KEY'],
      alphaVantageKey: process.env['ALPHA_VANTAGE_API_KEY'],
      openRouterKey: process.env['OPENROUTER_API_KEY']
    })
  }

  private async authenticateUser() {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    return { user, supabase }
  }

  async getInsights(request: NextRequest) {
    try {
      const { user } = await this.authenticateUser()
      const body = await request.json()
      
      const { organizationId, context }: { organizationId: string, context: FYIContext } = body

      if (!organizationId || !context) {
        return NextResponse.json(
          { error: 'Organization ID and context are required' },
          { status: 400 }
        )
      }

      const fyiService = await this.getFYIService()
      const insights = await fyiService.fetchInsights(organizationId, user.id, context)

      return NextResponse.json({
        insights,
        context,
        metadata: {
          timestamp: new Date().toISOString(),
          count: insights.length,
          userId: user.id,
          organizationId
        }
      })
    } catch (error) {
      console.error('FYI insights error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: error instanceof Error && error.message.includes('Authentication') ? 401 : 500 }
      )
    }
  }

  async getUserPreferences(request: NextRequest) {
    try {
      const { user } = await this.authenticateUser()
      const fyiService = await this.getFYIService()
      const preferences = await fyiService.getUserPreferences(user.id)

      return NextResponse.json({ preferences })
    } catch (error) {
      console.error('Get user preferences error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: error instanceof Error && error.message.includes('Authentication') ? 401 : 500 }
      )
    }
  }

  async updateUserPreferences(request: NextRequest) {
    try {
      const { user } = await this.authenticateUser()
      const body = await request.json()
      const { preferences } = body

      if (!preferences) {
        return NextResponse.json(
          { error: 'Preferences data is required' },
          { status: 400 }
        )
      }

      const fyiService = await this.getFYIService()
      const updatedPreferences = await fyiService.updateUserPreferences(user.id, preferences)

      return NextResponse.json({ preferences: updatedPreferences })
    } catch (error) {
      console.error('Update user preferences error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: error instanceof Error && error.message.includes('Authentication') ? 401 : 500 }
      )
    }
  }

  async logInteraction(request: NextRequest) {
    try {
      const { user } = await this.authenticateUser()
      const body = await request.json()
      const { insightId, action, organizationId } = body

      if (!insightId || !action) {
        return NextResponse.json(
          { error: 'Insight ID and action are required' },
          { status: 400 }
        )
      }

      const fyiService = await this.getFYIService()
      await fyiService.logUserInteraction(user.id, insightId, action, organizationId)

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Log interaction error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: error instanceof Error && error.message.includes('Authentication') ? 401 : 500 }
      )
    }
  }
}

// Export singleton instance
export const fyiController = new FYIController()