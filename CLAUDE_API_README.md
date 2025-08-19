# Claude API Integration for BoardGuru

This document outlines the Claude API integration implemented in BoardGuru for AI-powered document summarization and interactive chatbot capabilities.

## Features

### 🤖 Document Summarization
- Intelligent analysis of board documents using Claude 3.5 Sonnet
- Customizable summary length (short, medium, long)
- Optional key points, risks, and action items extraction
- Audio script generation for accessibility
- Professional business and governance focus

### 💬 AI Chatbot
- Interactive Q&A about board documents
- Context-aware responses using document content
- Conversation history management
- Session-based chat tracking
- Enterprise-focused governance assistance

## Setup

### 1. Environment Configuration

Add your Anthropic API key to `.env.local`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Dependencies

The integration uses:
- `@anthropic-ai/sdk` - Official Anthropic SDK
- Built-in Next.js API routes
- TypeScript for type safety

### 3. API Endpoints

#### Document Summarization
`POST /api/summarize-document`

```typescript
{
  content: string;           // Document content to summarize
  fileName: string;          // Name of the document
  includeKeyPoints?: boolean; // Include critical issues and risks
  includeActionItems?: boolean; // Include recommended actions
  maxLength?: 'short' | 'medium' | 'long'; // Summary length
  generateAudio?: boolean;    // Generate audio script
}
```

#### AI Chat
`POST /api/chat`

```typescript
{
  message: string;                    // User message
  context?: string;                   // Document context
  conversationHistory?: ChatMessage[]; // Previous messages
  sessionId?: string;                 // Chat session ID
}
```

## Components

### DocumentSummarizer Component
Located at `src/components/ai/DocumentSummarizer.tsx`

```tsx
<DocumentSummarizer
  initialContent="Board meeting minutes..."
  fileName="Q3 Board Minutes"
  onSummaryGenerated={(summary, audioScript) => {
    // Handle generated summary
  }}
/>
```

### AIChat Component
Located at `src/components/ai/AIChat.tsx`

```tsx
<AIChat
  documentContext="Board pack content..."
  initialMessage="What are the key decisions from this meeting?"
/>
```

## Usage Examples

### Basic Document Summarization

```typescript
import { summarizeDocumentAPI } from '@/lib/api/claude-client';

const result = await summarizeDocumentAPI({
  content: documentText,
  fileName: 'Board Meeting Minutes',
  includeKeyPoints: true,
  includeActionItems: true,
  maxLength: 'medium'
});

if (result.success) {
  console.log('Summary:', result.summary);
}
```

### Interactive Chat

```typescript
import { chatAPI } from '@/lib/api/claude-client';

const response = await chatAPI({
  message: "What are the main financial risks mentioned?",
  context: documentContent,
  conversationHistory: previousMessages
});

if (response.success) {
  console.log('AI Response:', response.message);
}
```

## Security Features

- Server-side API key management
- Input validation and sanitization
- Content length limits to prevent abuse
- Error handling with user-friendly messages
- Token usage tracking for monitoring

## Token Management

The integration tracks Claude API usage:
- Input tokens (document content + prompts)
- Output tokens (generated summaries/responses)
- Usage information returned with API responses

## Model Configuration

### Document Summarization
- **Model**: claude-3-5-sonnet-20241022
- **Temperature**: 0.3 (focused, consistent responses)
- **Max Tokens**: 4000
- **System Prompt**: Business analyst specialization

### Chat Interactions
- **Model**: claude-3-5-sonnet-20241022
- **Temperature**: 0.7 (more conversational)
- **Max Tokens**: 2000
- **System Prompt**: BoardGuru AI assistant

### Audio Script Generation
- **Model**: claude-3-5-haiku-20241022 (faster, cost-effective)
- **Temperature**: 0.4
- **Max Tokens**: 2000

## Error Handling

The integration includes comprehensive error handling:
- Network connectivity issues
- API rate limiting
- Invalid input validation
- Claude API errors
- Timeout handling

## Performance Considerations

- Conversation history limited to last 10 exchanges
- Document content capped at 100,000 characters
- Message length limited to 5,000 characters
- Efficient model selection (Haiku for audio scripts)

## Integration Points

The Claude API integrates with existing BoardGuru features:
- File upload processing pipeline
- User authentication and permissions
- Audit logging for AI interactions
- Role-based access to AI features

## Testing

To test the integration:

1. Ensure `ANTHROPIC_API_KEY` is set in `.env.local`
2. Start the development server: `npm run dev`
3. Navigate to pages with AI components
4. Test document upload and summarization
5. Test interactive chat functionality

## Monitoring

Consider implementing:
- Usage analytics for AI features
- Performance monitoring for API calls
- Cost tracking for Claude API usage
- User feedback collection

## Future Enhancements

Potential improvements:
- Batch document processing
- Custom prompt templates
- Integration with document version control
- Advanced conversation memory
- Multi-language support
- Voice-to-text integration