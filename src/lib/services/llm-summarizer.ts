interface SummaryRequest {
  title: string
  content: string
  context?: string
  maxLength?: number
  style?: 'brief' | 'detailed' | 'bullet-points'
}

interface SummaryResponse {
  summary: string
  keyPoints: string[]
  relevanceScore: number
  tags: string[]
}

class LLMSummarizer {
  private apiKey: string
  private baseURL = 'https://openrouter.ai/api/v1'

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || ''
  }

  async summarizeInsight({
    title,
    content,
    context = '',
    maxLength = 200,
    style = 'brief'
  }: SummaryRequest): Promise<SummaryResponse> {
    if (!this.apiKey) {
      // Fallback to simple extractive summarization
      return this.fallbackSummarization({ title, content, maxLength })
    }

    try {
      const systemPrompt = this.buildSystemPrompt(style, maxLength, context)
      const userPrompt = this.buildUserPrompt(title, content)

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'BoardGuru FYI Insights'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        console.warn('LLM API failed, using fallback summarization')
        return this.fallbackSummarization({ title, content, maxLength })
      }

      const data = await response.json()
      const aiResponse = data.choices?.[0]?.message?.content

      if (!aiResponse) {
        return this.fallbackSummarization({ title, content, maxLength })
      }

      return this.parseAIResponse(aiResponse)
    } catch (error) {
      console.error('Error in LLM summarization:', error)
      return this.fallbackSummarization({ title, content, maxLength })
    }
  }

  private buildSystemPrompt(style: string, maxLength: number, context: string): string {
    const contextInstruction = context 
      ? `The user is currently focused on: "${context}". Emphasize aspects related to this context.`
      : ''

    const styleInstructions = {
      'brief': 'Create a concise, single-paragraph summary',
      'detailed': 'Provide a comprehensive summary with key details',
      'bullet-points': 'Structure the summary as clear bullet points'
    }

    return `You are an expert business analyst summarizing external insights for executives.

${contextInstruction}

Instructions:
- ${styleInstructions[style as keyof typeof styleInstructions]}
- Maximum length: ${maxLength} characters
- Focus on actionable insights and business impact
- Extract 3-5 key points
- Assign a relevance score (0.0-1.0) based on business importance
- Identify relevant tags (industry, company names, trends, etc.)
- Write in professional, clear language

Respond in this JSON format:
{
  "summary": "your summary here",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "relevanceScore": 0.75,
  "tags": ["tag1", "tag2", "tag3"]
}

Only return the JSON, no additional text.`
  }

  private buildUserPrompt(title: string, content: string): string {
    return `Title: ${title}

Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Please analyze and summarize this content according to the system instructions.`
  }

  private parseAIResponse(response: string): SummaryResponse {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : response

      const parsed = JSON.parse(jsonStr)

      return {
        summary: parsed.summary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        relevanceScore: typeof parsed.relevanceScore === 'number' 
          ? Math.max(0, Math.min(1, parsed.relevanceScore)) 
          : 0.5,
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      }
    } catch (error) {
      console.error('Error parsing AI response:', error)
      
      // Try to extract at least the summary from plain text
      const lines = response.split('\n').filter(line => line.trim())
      const summary = lines.slice(0, 3).join(' ').substring(0, 200)

      return {
        summary: summary || 'Summary unavailable',
        keyPoints: [],
        relevanceScore: 0.5,
        tags: []
      }
    }
  }

  private fallbackSummarization({
    title,
    content,
    maxLength
  }: {
    title: string
    content: string
    maxLength: number
  }): SummaryResponse {
    // Simple extractive summarization
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    
    if (sentences.length === 0) {
      return {
        summary: content.substring(0, maxLength),
        keyPoints: [],
        relevanceScore: 0.5,
        tags: this.extractBasicTags(title + ' ' + content)
      }
    }

    // Take first 2-3 sentences up to maxLength
    let summary = ''
    let sentenceCount = 0
    
    for (const sentence of sentences) {
      const testSummary = summary + sentence.trim() + '. '
      if (testSummary.length > maxLength && summary.length > 0) break
      
      summary = testSummary
      sentenceCount++
      
      if (sentenceCount >= 3) break
    }

    return {
      summary: summary.trim() || content.substring(0, maxLength),
      keyPoints: sentences.slice(0, 3).map(s => s.trim()),
      relevanceScore: 0.5,
      tags: this.extractBasicTags(title + ' ' + content)
    }
  }

  private extractBasicTags(text: string): string[] {
    const lowercaseText = text.toLowerCase()
    const tags: string[] = []

    // Industry keywords
    const industries = [
      'technology', 'tech', 'ai', 'artificial intelligence',
      'finance', 'banking', 'fintech',
      'healthcare', 'medical', 'pharma',
      'energy', 'renewable', 'oil', 'gas',
      'retail', 'ecommerce', 'consumer',
      'automotive', 'transportation',
      'real estate', 'construction',
      'telecommunications', 'media'
    ]

    industries.forEach(industry => {
      if (lowercaseText.includes(industry)) {
        tags.push(industry)
      }
    })

    // Business concepts
    const concepts = [
      'earnings', 'revenue', 'growth', 'merger', 'acquisition',
      'ipo', 'funding', 'investment', 'market share',
      'competition', 'innovation', 'regulation', 'compliance'
    ]

    concepts.forEach(concept => {
      if (lowercaseText.includes(concept)) {
        tags.push(concept)
      }
    })

    return [...new Set(tags)].slice(0, 5) // Remove duplicates and limit
  }

  async summarizeMultipleInsights(insights: SummaryRequest[]): Promise<SummaryResponse[]> {
    // Process in batches to avoid rate limits
    const batchSize = 5
    const results: SummaryResponse[] = []

    for (let i = 0; i < insights.length; i += batchSize) {
      const batch = insights.slice(i, i + batchSize)
      
      const batchPromises = batch.map(insight => 
        this.summarizeInsight(insight).catch(error => {
          console.error('Error summarizing insight:', error)
          return this.fallbackSummarization({
            title: insight.title,
            content: insight.content,
            maxLength: insight.maxLength || 200
          })
        })
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < insights.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}

// Export singleton instance
export const llmSummarizer = new LLMSummarizer()

export type { SummaryRequest, SummaryResponse }