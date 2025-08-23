# AI Board Secretary System Documentation

## Overview

The AI Board Secretary system is a comprehensive solution for automating board governance tasks using artificial intelligence. It provides intelligent assistance for meeting management, transcription, minutes generation, action item tracking, and compliance monitoring.

## Architecture

The system follows a Domain-Driven Design (DDD) architecture with clear separation of concerns:

### Core Components

1. **Service Layer** (`/src/lib/services/ai-board-secretary.service.ts`)
   - Main business logic
   - OpenRouter API integration
   - Result pattern for error handling
   - Follows base service architecture

2. **API Routes** (`/src/app/api/board-secretary/`)
   - RESTful endpoints with validation
   - Authentication and authorization
   - Following Next.js 13+ app router patterns

3. **React Components** (`/src/components/board-secretary/`)
   - Atomic design pattern (atoms, molecules, organisms)
   - TypeScript with strict typing
   - Real-time updates integration

4. **WebSocket Service** (`/src/lib/websocket/board-secretary-websocket.service.ts`)
   - Real-time communication
   - Event-driven architecture
   - Automatic reconnection handling

5. **Database Schema**
   - PostgreSQL with Supabase
   - Comprehensive tables for all entities
   - Proper indexing and relationships

## Features

### 1. Automated Meeting Minutes Generation

#### Audio/Video Transcription
- **Service**: `AIBoardSecretaryService.requestTranscription()`
- **API**: `POST /api/board-secretary/transcription`
- **Integration**: OpenRouter API with Whisper models
- **Features**:
  - Speaker identification and diarization
  - Multi-language support
  - Real-time processing status updates
  - Error handling and retry logic

```typescript
// Example usage
const transcriptionResult = await service.requestTranscription({
  meeting_id: 'meeting-123',
  audio_file_url: 'https://example.com/audio.mp3',
  language: 'en'
});
```

#### Intelligent Minutes Generation
- **Service**: `AIBoardSecretaryService.generateMeetingMinutes()`
- **API**: `POST /api/board-secretary/minutes/generate`
- **Features**:
  - Structured content extraction
  - Decision and voting record tracking
  - Resolution management
  - AI-powered formatting

### 2. Smart Agenda Creation

#### AI-Powered Generation
- **Service**: `AIBoardSecretaryService.generateSmartAgenda()`
- **API**: `POST /api/board-secretary/agenda/generate`
- **Features**:
  - Previous meeting context integration
  - Pending action items inclusion
  - Template-based generation
  - Time allocation recommendations

```typescript
// Example agenda generation
const agenda = await service.generateSmartAgenda('meeting-123', {
  include_previous_items: true,
  custom_items: [
    { title: 'Budget Review', description: 'Q4 budget analysis' }
  ]
});
```

### 3. Action Item Intelligence

#### Automatic Extraction
- **Service**: `AIBoardSecretaryService.extractActionItems()`
- **API**: `POST /api/board-secretary/action-items/extract`
- **Features**:
  - AI-powered extraction from transcriptions
  - Confidence scoring
  - Context reference linking
  - Smart assignment based on roles

#### Progress Tracking
- **Service**: `AIBoardSecretaryService.updateActionItemProgress()`
- **API**: `PUT /api/board-secretary/action-items/[id]`
- **Features**:
  - Real-time progress updates
  - Automated reminders
  - Escalation workflows
  - Deadline prediction

### 4. Compliance Alerts System

#### Monitoring
- **Service**: `AIBoardSecretaryService.checkComplianceAlerts()`
- **API**: `POST /api/board-secretary/compliance/check`
- **Features**:
  - Filing deadline monitoring
  - Regulatory requirement tracking
  - Automated alert generation
  - Severity-based prioritization

## Database Schema

### Core Tables

#### board_meetings
```sql
CREATE TABLE board_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id),
    meeting_title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(50) DEFAULT 'regular',
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    -- Additional fields...
);
```

#### meeting_transcriptions
```sql
CREATE TABLE meeting_transcriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES board_meetings(id),
    transcription_text TEXT,
    speakers JSONB DEFAULT '[]'::jsonb,
    processing_status VARCHAR(20) DEFAULT 'pending',
    -- Additional fields...
);
```

#### action_items
```sql
CREATE TABLE action_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES board_meetings(id),
    title VARCHAR(255) NOT NULL,
    assigned_to UUID REFERENCES boardmate_profiles(id),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    -- Additional fields...
);
```

#### compliance_requirements
```sql
CREATE TABLE compliance_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id),
    requirement_name VARCHAR(255) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    next_due_date DATE,
    -- Additional fields...
);
```

## API Endpoints

### Meetings Management
- `GET /api/board-secretary/meetings` - List meetings with filters
- `POST /api/board-secretary/meetings` - Create new meeting

### Transcription
- `POST /api/board-secretary/transcription` - Request transcription
- `GET /api/board-secretary/transcription` - Get transcription status

### Minutes
- `POST /api/board-secretary/minutes/generate` - Generate minutes
- `GET /api/board-secretary/minutes` - Get minutes with filters

### Action Items
- `GET /api/board-secretary/action-items` - List action items
- `POST /api/board-secretary/action-items` - Create action item
- `PUT /api/board-secretary/action-items/[id]` - Update progress
- `POST /api/board-secretary/action-items/extract` - Extract from meeting

### Compliance
- `GET /api/board-secretary/compliance` - Get requirements and alerts
- `POST /api/board-secretary/compliance` - Create requirement
- `POST /api/board-secretary/compliance/check` - Check compliance

### Agenda
- `POST /api/board-secretary/agenda/generate` - Generate smart agenda
- `GET /api/board-secretary/agenda` - Get agendas

### Settings
- `GET /api/board-secretary/settings` - Get board secretary settings
- `PUT /api/board-secretary/settings` - Update settings

## Component Library

### Atoms
- `MeetingStatusBadge` - Meeting status indicator
- `ActionItemPriorityBadge` - Priority level display
- `ComplianceAlertBadge` - Alert severity indicator
- `TranscriptionStatusIndicator` - Processing status

### Molecules
- `MeetingCard` - Meeting information card
- `ActionItemCard` - Action item with progress tracking
- `ComplianceAlertCard` - Alert with action buttons

### Organisms
- `MeetingsOverview` - Complete meetings dashboard
- `ActionItemsDashboard` - Action items management
- `ComplianceDashboard` - Compliance monitoring interface

## Real-Time Updates

### WebSocket Events
- `meeting_created` - New meeting added
- `meeting_status_changed` - Status updates
- `transcription_completed` - Transcription finished
- `action_item_updated` - Progress changes
- `compliance_alert_created` - New alerts
- `ai_job_status_updated` - AI processing updates

### Usage Example
```typescript
import { useBoardSecretaryWebSocket } from '@/lib/websocket/board-secretary-websocket.service';

const boardId = 'board-123';
const handlers = {
  onMeetingCreated: (event) => {
    // Handle new meeting
    refreshMeetings();
  },
  onTranscriptionCompleted: (event) => {
    // Update transcription status
    updateTranscriptionStatus(event.data.transcriptionId);
  }
};

const wsService = useBoardSecretaryWebSocket(boardId, handlers);
```

## AI Integration

### OpenRouter Configuration
The system integrates with OpenRouter API for AI processing:

- **Models Used**:
  - Transcription: `openai/whisper-large-v3`
  - Text Processing: `anthropic/claude-3.5-sonnet`
  - Fallback: User-configurable models

- **Configuration**: Through user AI settings or environment variables
- **Error Handling**: Comprehensive retry logic and fallback strategies

### AI Processing Jobs
All AI operations are tracked through the `ai_processing_jobs` table:

```typescript
// Queue AI job
await service.queueAIJob({
  job_type: 'transcription',
  reference_id: 'transcription-123',
  reference_type: 'meeting_transcription',
  input_data: { audio_url: 'https://...' },
  priority: 5
});
```

## Security & Privacy

### Authentication
- User authentication through Supabase Auth
- Role-based access control for board members
- API key encryption for AI services

### Permissions
- Board-level access control
- Admin roles for meeting creation
- Member access for viewing and participation

### Data Privacy
- Secure storage of meeting recordings
- Encrypted API keys
- Audit logging for all operations

## Testing

### Test Coverage
- **Unit Tests**: Service layer, components, utilities
- **Integration Tests**: API routes, database operations
- **E2E Tests**: WebSocket communication, AI workflows

### Test Structure
```
__tests__/
├── services/
│   ├── ai-board-secretary.service.test.ts
│   └── websocket.service.test.ts
├── api/
│   ├── meetings.route.test.ts
│   └── compliance.route.test.ts
└── components/
    ├── MeetingCard.test.tsx
    └── ActionItemCard.test.tsx
```

### Running Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Deployment

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Service Configuration
OPENROUTER_API_KEY=your-openrouter-key

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

### Database Migration
```bash
# Run the schema migration
psql -f ai-board-secretary-schema.sql your_database_url
```

### Production Setup
1. Deploy database schema to production Supabase instance
2. Configure environment variables
3. Set up WebSocket server for real-time updates
4. Configure AI service API keys
5. Set up monitoring and logging

## Performance Optimization

### Caching Strategy
- API response caching for static data
- WebSocket connection pooling
- Database query optimization with indexes

### Lazy Loading
- Component-based code splitting
- Progressive data loading
- Image and media lazy loading

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization for large datasets
- Connection pooling

## Monitoring & Observability

### Logging
- Structured logging with contextual information
- Error tracking with stack traces
- Performance metrics collection

### Health Checks
- Database connectivity monitoring
- AI service availability checks
- WebSocket connection health

### Metrics
- API response times
- AI processing duration
- WebSocket message throughput
- User engagement analytics

## Future Enhancements

### Planned Features
1. **Advanced AI Models**: Integration with specialized board governance AI models
2. **Multi-language Support**: Enhanced language detection and processing
3. **Mobile App**: Native mobile application for on-the-go access
4. **Advanced Analytics**: Detailed governance analytics and reporting
5. **Integration APIs**: Third-party calendar and document management integration

### Scalability Improvements
1. **Microservices Architecture**: Breaking down into smaller services
2. **Event Sourcing**: Complete audit trail with event sourcing
3. **Horizontal Scaling**: Load balancing and service distribution
4. **Edge Computing**: Global edge deployment for low latency

## Support & Troubleshooting

### Common Issues

#### Transcription Failures
- Check audio/video file accessibility
- Verify OpenRouter API key configuration
- Review file format compatibility

#### WebSocket Connection Issues
- Verify WebSocket URL configuration
- Check network connectivity
- Review browser WebSocket support

#### AI Processing Delays
- Monitor AI service quotas and limits
- Check processing queue status
- Verify model availability

### Debug Tools
- Browser developer tools for client-side debugging
- Server logs for API issues
- Database query analysis for performance issues

### Getting Help
- Check system health status
- Review error logs and stack traces
- Contact support with detailed error information

## Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Run tests
npm test
```

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier for code formatting
- Comprehensive test coverage required

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation as needed
4. Submit PR with detailed description
5. Address review feedback
6. Merge after approval

This documentation provides a comprehensive guide to the AI Board Secretary system, covering all aspects from architecture to deployment and maintenance.