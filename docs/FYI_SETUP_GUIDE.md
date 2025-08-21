# FYI Tab Setup Guide

The FYI (For Your Information) tab provides context-aware external insights next to the Activity Log. This guide covers setup and testing.

## ✅ **What's Been Implemented**

### 1. **Core Components**
- `FYITab.tsx` - Main FYI interface with context detection
- `FYIInsightCard.tsx` - Individual insight display cards  
- `FYIFilters.tsx` - Advanced filtering system
- `SecurityActivityPanel.tsx` - Container with Activity Log + FYI tabs

### 2. **Backend Services**
- `/api/fyi/insights` - API endpoint for fetching insights
- `useContextDetection.ts` - Real-time content context detection
- `useFYIService.ts` - External data service hook
- `llm-summarizer.ts` - AI-powered summarization
- `rate-limiter.ts` - API rate limiting

### 3. **Database Schema** 
- `fyi_insights_cache` - Cache external insights
- `fyi_user_preferences` - User preferences
- `fyi_user_interactions` - Usage tracking
- `fyi_context_history` - Context tracking

### 4. **Security & Performance**
- User authentication required
- Rate limiting (50 requests/hour per user)
- Error boundaries for graceful failures
- Caching to reduce external API calls

## 🚀 **Setup Instructions**

### 1. **Environment Variables**
Add to your `.env.local`:

```bash
# External Data Sources (Optional)
NEWS_API_KEY=your-newsapi-key-here          # Get from https://newsapi.org/register
ALPHA_VANTAGE_API_KEY=your-alphavantage-key # Get from https://www.alphavantage.co/support/#api-key

# Required for LLM summarization
OPENROUTER_API_KEY=your-openrouter-key      # Already configured
```

### 2. **Database Migration**
Run the FYI database migration:

```bash
# If using Supabase
npx supabase db push database/migrations/add_fyi_tables.sql

# Or execute the SQL directly in your database
```

### 3. **Test the Implementation**

#### Access the FYI Tab:
1. Go to **Settings** → **Security & Activity**
2. Click the **FYI** tab next to **Activity Log**
3. The tab should load with context-aware insights

#### Test Context Detection:
1. Navigate to different pages in your app
2. Open the FYI tab
3. You should see "Current Context" showing detected content
4. Insights should be relevant to the current page content

## 🔧 **How It Works**

### Context Detection Flow:
1. **DOM Monitoring** - Watches for content changes on the page
2. **Entity Extraction** - Identifies companies, people, keywords from text
3. **Context Classification** - Determines if content is about organizations, projects, etc.
4. **API Trigger** - Sends context to FYI API for insight fetching

### External Data Sources:
- **NewsAPI** - Latest news articles (100/day free tier)
- **Alpha Vantage** - Financial/market data (5/minute free tier)
- **Future**: Can add more sources (SEC filings, social media, etc.)

### AI Summarization:
- Uses Claude-3-Haiku via OpenRouter for intelligent summaries
- Falls back to extractive summarization if AI unavailable
- Extracts key points, tags, and relevance scores

## 🧪 **Testing Without External APIs**

The system works without external API keys:

1. **No API Keys** → Shows "No insights available" message
2. **Rate Limits Exceeded** → Shows cached insights or fallback message
3. **API Failures** → Error boundaries show graceful fallback UI

## 📊 **Insight Types & Prioritization**

### Insight Types:
- **News** - Latest news articles
- **Competitor** - Competitor analysis
- **Industry** - Industry trends
- **Regulation** - Regulatory changes
- **Market** - Financial/market data

### Prioritization:
- **High Priority** (Red) - Relevance score ≥ 80%
- **Medium Priority** (Orange) - Relevance score ≥ 60%
- **Low Priority** (Gray) - Relevance score < 60%

## 🎛️ **User Controls**

### Filters Available:
- **Insight Type** - Filter by news, competitor, industry, etc.
- **Relevance Threshold** - Slider from 0-100%
- **Date Range** - From/to date filters
- **Search** - Keywords in titles/summaries

### Auto-Features:
- **Context Awareness** - Updates based on current page content
- **Real-time Updates** - Refreshes when context changes
- **Caching** - Avoids redundant API calls

## 🔒 **Security & Privacy**

- User authentication required for all FYI API calls
- Row-level security on all database tables
- Rate limiting prevents API abuse
- No sensitive user data sent to external APIs
- Context detection works locally (client-side)

## 🐛 **Troubleshooting**

### Common Issues:

1. **"Unauthorized" Error**
   - Ensure user is logged in
   - Check Supabase authentication

2. **"Rate limit exceeded"** 
   - Wait for rate limit reset
   - Check rate limiter configuration

3. **"No insights available"**
   - Add external API keys
   - Check API key validity
   - Verify network connectivity

4. **Context not detecting**
   - Ensure page has sufficient text content (>20 chars)
   - Check browser console for DOM monitoring errors

### Debug Mode:
Enable debug logging by setting:
```bash
NODE_ENV=development
```

## 🚀 **Next Steps**

To make the FYI tab fully functional:

1. **Add API Keys** - Configure NewsAPI and Alpha Vantage
2. **Run Migration** - Execute database schema
3. **Test Context** - Navigate pages and verify context detection  
4. **Customize Sources** - Add more external data sources as needed

The FYI tab is now ready for production use with proper API configuration!