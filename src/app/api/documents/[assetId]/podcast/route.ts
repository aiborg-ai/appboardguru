import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await (supabase as any)
      .from('vault_assets')
      .select('*, vaults!inner(user_id)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vaults?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if podcast already exists and is recent
    const { data: existingPodcast, error: podcastError } = await (supabase as any)
      .from('document_podcasts')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (podcastError) {
      console.error('Error fetching existing podcast:', podcastError)
    }

    // If podcast exists and is recent (less than 24 hours), return it
    if (existingPodcast && existingPodcast.length > 0) {
      const podcast = (existingPodcast as any[])[0]
      const createdAt = new Date((podcast as any)?.created_at)
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        return NextResponse.json({
          id: (podcast as any)?.id,
          title: (podcast as any)?.title,
          duration: (podcast as any)?.duration,
          audioUrl: (podcast as any)?.audio_url,
          transcript: (podcast as any)?.transcript,
          generatedAt: (podcast as any)?.created_at
        })
      }
    }

    // Generate new podcast using AI
    const generatedPodcast = await generateDocumentPodcast(asset)

    // Save generated podcast to database
    const { data: savedPodcast, error: saveError } = await (supabase as any)
      .from('document_podcasts')
      .insert({
        asset_id: assetId,
        title: (generatedPodcast as any)?.title,
        duration: (generatedPodcast as any)?.duration,
        audio_url: (generatedPodcast as any)?.audioUrl,
        transcript: (generatedPodcast as any)?.transcript,
        user_id: user.id
      } as any)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving podcast:', saveError)
      // Still return the generated podcast even if save fails
      return NextResponse.json(generatedPodcast)
    }

    return NextResponse.json({
      id: (savedPodcast as any)?.id,
      title: (savedPodcast as any)?.title,
      duration: (savedPodcast as any)?.duration,
      audioUrl: (savedPodcast as any)?.audio_url,
      transcript: (savedPodcast as any)?.transcript,
      generatedAt: (savedPodcast as any)?.created_at
    })

  } catch (error) {
    console.error('Error generating podcast:', error)
    return NextResponse.json(
      { error: 'Failed to generate podcast' },
      { status: 500 }
    )
  }
}

async function generateDocumentPodcast(asset: any) {
  // This is a simplified podcast generation for demonstration
  // In a real implementation, you would:
  // 1. Extract text from the PDF/document
  // 2. Use an LLM to create a natural, conversational script
  // 3. Use text-to-speech AI to generate the audio
  // 4. Upload the audio file to storage and return the URL

  const documentType = (asset as any)?.name?.toLowerCase() || ''
  let title = "Document Podcast"
  let transcript = ""

  if (documentType.includes('report')) {
    title = "Research Report Podcast"
    transcript = `Welcome to this audio summary of the research report. 

In this three-minute podcast, we'll explore the key findings and insights from this comprehensive study.

The report begins with an executive summary that outlines the main objectives and scope of the research. The methodology section describes a rigorous approach combining both quantitative analysis and qualitative insights to ensure robust findings.

Key findings from the study reveal several important trends. First, the data shows a significant correlation between the variables studied, with statistical significance at the 95% confidence level. Second, the analysis identifies three critical success factors that drive positive outcomes.

The discussion section provides valuable context, interpreting these findings within the broader landscape of existing research. This helps establish the credibility and relevance of the results.

Finally, the recommendations section offers practical, actionable steps for implementation. These evidence-based suggestions provide a clear roadmap for organizations looking to apply these insights.

The report concludes by identifying areas for future research, ensuring that this work contributes to ongoing knowledge development in the field.

Thank you for listening to this summary. For detailed information, please refer to the complete document.`
  } else if (documentType.includes('proposal')) {
    title = "Project Proposal Podcast"
    transcript = `Welcome to this audio overview of the project proposal.

This proposal outlines a comprehensive solution to address the identified challenges and opportunities. Let me walk you through the key components.

The proposal starts by clearly defining the problem statement and establishing the context for why this project is needed. It identifies specific pain points and quantifies the impact of not addressing these issues.

The proposed solution section details a multi-phase approach designed to deliver maximum value while minimizing risk. The methodology combines proven strategies with innovative approaches tailored to the specific requirements.

Budget considerations are thoroughly addressed, with a detailed breakdown of resource requirements, timeline expectations, and expected return on investment. The proposal includes contingency planning to address potential challenges.

The implementation roadmap provides a clear timeline with defined milestones and success metrics. This ensures accountability and enables progress tracking throughout the project lifecycle.

Risk assessment and mitigation strategies demonstrate thorough planning and preparation for potential obstacles. The proposal anticipates challenges and provides concrete steps to address them.

Expected outcomes are clearly defined with measurable success criteria. This enables objective evaluation of project performance and ensures alignment with organizational goals.

Thank you for your attention. This proposal represents a strategic opportunity to achieve significant value and drive meaningful results.`
  } else {
    title = `${(asset as any)?.name || 'Document'} - Audio Summary`
    transcript = `Welcome to this audio summary of the document.

This comprehensive document covers important topics and provides valuable insights for readers. Let me highlight the key points and main takeaways.

The document is well-structured and organized, making it easy to navigate and understand the core concepts. It begins with foundational information that establishes context and builds understanding.

Key sections include detailed analysis of the subject matter, supported by relevant data and evidence. The content demonstrates thorough research and thoughtful consideration of multiple perspectives.

Important findings and conclusions are clearly presented, with supporting rationale that helps readers understand the reasoning behind key recommendations.

Practical applications and implementation guidance are provided throughout, making this document not just informative but also actionable for readers who want to apply these insights.

The document includes references and supporting materials that enhance credibility and provide opportunities for further exploration of the topics covered.

Overall, this is a valuable resource that provides comprehensive coverage of the subject matter with practical insights that readers can apply in their own contexts.

Thank you for listening to this summary. I encourage you to review the full document for complete details and additional information.`
  }

  // Calculate duration based on transcript (average reading speed: 150 words per minute, podcast speed: 130 wpm)
  const wordCount = transcript.split(' ').length
  const duration = Math.round((wordCount / 130) * 60) // duration in seconds

  // In a real implementation, you would generate actual audio and upload it
  // For now, we'll use a placeholder audio URL
  const audioUrl = `/api/audio/placeholder.mp3` // This would be the actual generated audio URL

  // Simulate AI processing delay (longer for podcast generation)
  await new Promise(resolve => setTimeout(resolve, 3000))

  return {
    id: `podcast-${Date.now()}`,
    title,
    duration,
    audioUrl,
    transcript,
    generatedAt: new Date().toISOString()
  }
}