# PDF Document Annotation System

## Overview

A comprehensive collaborative PDF annotation system for BoardGuru that allows multiple users in the same vault to highlight, comment, and discuss PDF documents in real-time.

## Features Implemented

### ✅ Core Annotation Features
- **PDF Highlighting**: Select and highlight text in PDF documents
- **Comments**: Add text comments to annotations
- **Multiple Colors**: Choose from predefined color palette for highlights
- **Page Navigation**: Annotations linked to specific PDF pages
- **Private/Public**: Option to make annotations private or visible to vault members

### ✅ Collaborative Features
- **Multi-User Support**: Multiple users can annotate the same document simultaneously
- **Real-Time Updates**: Live sync of annotations across all connected users
- **User Attribution**: All annotations show creator name and timestamp
- **Threaded Discussions**: Reply to annotations with nested conversations
- **@Mentions**: Mention other users in replies (with notification system ready)
- **Reactions**: Add emoji reactions to annotations and replies

### ✅ Advanced Features
- **Resolution Status**: Mark annotation discussions as resolved/unresolved
- **Soft Delete**: Annotations are soft-deleted for data recovery
- **Search Support**: Full-text search across annotation content
- **Filtering**: Filter annotations by user, color, status, etc.
- **Audit Trail**: Complete activity logging for compliance

## Architecture

### Database Schema

#### Core Tables
1. **`asset_annotations`** - Main annotation data
   - Position and visual properties
   - Text content and comments
   - Status and privacy settings
   - Soft delete support

2. **`annotation_replies`** - Threaded discussions
   - Nested reply support
   - Edit tracking
   - User attribution

3. **`annotation_reactions`** - Emoji reactions
   - Support for both annotations and replies
   - Unique constraint per user/emoji

4. **`annotation_mentions`** - @mention notifications
   - Links to annotations or replies
   - Read status tracking

5. **`user_annotation_preferences`** - User settings
   - Default colors and opacity
   - Notification preferences
   - UI behavior settings

### API Endpoints

#### Annotations API
- `GET /api/assets/[id]/annotations` - Fetch all annotations
- `POST /api/assets/[id]/annotations` - Create new annotation
- `GET /api/assets/[id]/annotations/[annotationId]` - Get specific annotation
- `PATCH /api/assets/[id]/annotations/[annotationId]` - Update annotation
- `DELETE /api/assets/[id]/annotations/[annotationId]` - Delete annotation

#### Replies API
- `GET /api/assets/[id]/annotations/[annotationId]/replies` - Get replies
- `POST /api/assets/[id]/annotations/[annotationId]/replies` - Create reply

### Components

#### Main Components
1. **`PDFAnnotationViewer`** - Core PDF viewer with annotation support
   - Based on `react-pdf-highlighter-extended`
   - Handles PDF rendering and annotation overlay
   - Manages annotation creation and interaction

2. **`AnnotationComments`** - Comment thread display
   - Shows annotation details and replies
   - Handles reply creation and management
   - Supports resolution status changes

3. **`useAnnotationSync`** - Real-time collaboration hook
   - Supabase real-time subscriptions
   - User presence tracking
   - Live annotation updates

#### UI Pages
- **`/dashboard/assets/[id]/annotations`** - Main annotation interface
  - Split layout with PDF viewer and annotation panel
  - Real-time user presence indicators
  - Comprehensive annotation management

## Security & Permissions

### Row Level Security (RLS)
- All annotation tables have RLS enabled
- Users can only see annotations in their organization's vaults
- Private annotations only visible to creators
- Proper access control through organization membership

### Data Validation
- Zod schemas for all API inputs
- Type-safe database operations
- Proper error handling and user feedback

### Audit Logging
- All annotation activities logged to `audit_logs` table
- Includes user, action, timestamp, and metadata
- Supports compliance and investigation needs

## Technology Stack

### Frontend
- **React PDF Highlighter Extended** - PDF annotation library
- **React 19** - UI framework (with legacy peer deps for compatibility)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives

### Backend
- **Next.js 15 API Routes** - Server-side logic
- **Supabase** - Database and real-time features
- **PostgreSQL** - Data storage with JSONB for flexible annotation data

### Real-Time Features
- **Supabase Realtime** - Live collaboration
- **WebSocket connections** - Real-time updates
- **Presence tracking** - Active user indicators

## Usage

### For Users
1. Navigate to any PDF asset in a vault
2. Click "Annotations" to open the annotation interface
3. Select text in the PDF to create highlights
4. Add comments and choose colors
5. View and reply to other users' annotations
6. Mark discussions as resolved when complete

### For Developers
1. Apply the database migration: `npm run db:migrate`
2. Update TypeScript types if needed
3. The annotation system is automatically available for all PDF assets
4. Use the provided components for custom annotation interfaces

## File Structure

```
src/
├── app/api/assets/[id]/annotations/          # API endpoints
│   ├── route.ts                              # Main annotations API
│   ├── [annotationId]/route.ts               # Individual annotation API
│   └── [annotationId]/replies/route.ts       # Replies API
├── components/annotations/                    # UI components
│   ├── PDFAnnotationViewer.tsx               # Main PDF viewer
│   ├── AnnotationComments.tsx                # Comment threads
│   └── ...
├── hooks/
│   └── useAnnotationSync.ts                  # Real-time collaboration
├── app/dashboard/assets/[id]/annotations/
│   └── page.tsx                              # Main annotation page
└── types/database.ts                         # Updated with annotation types
```

```
database/migrations/
└── 20250820_001_add_pdf_annotations_system.sql  # Database schema
```

## Key Benefits

1. **Enterprise-Ready**: Full audit trail, RLS security, organization isolation
2. **Collaborative**: Real-time updates, user presence, threaded discussions  
3. **Scalable**: Efficient database design with proper indexing
4. **User-Friendly**: Intuitive interface with familiar annotation patterns
5. **Extensible**: Modular design allows easy feature additions

## Future Enhancements

### Potential Additions
- **Drawing/Freehand Annotations**: Beyond text highlights
- **Voice Annotations**: Audio comments attached to highlights
- **Annotation Export**: Export annotations to PDF or other formats
- **Notification System**: Email/in-app notifications for mentions and replies
- **Advanced Search**: Search across all annotations in a vault/organization
- **Annotation Templates**: Predefined annotation types for consistent review processes
- **Integration with External Tools**: Sync with project management or review tools

### Performance Optimizations
- **Lazy Loading**: Load annotations only for visible PDF pages
- **Caching**: Cache frequently accessed annotations
- **Compression**: Optimize annotation position data storage
- **CDN Integration**: Serve PDF files from CDN for faster loading

## Migration Notes

The database migration includes:
- Complete table structure with indexes
- RLS policies for security
- Triggers for timestamp management
- Full rollback support (commented out for safety)

To apply: `npm run db:migrate`
To rollback: Uncomment rollback section in migration file and run `npm run db:rollback`

## Dependencies Added

- `react-pdf-highlighter-extended@^8.1.0` - Main annotation library
- `react-pdf@^10.1.0` - PDF rendering support
- `date-fns@^4.1.0` - Date formatting (already present)

## Summary

This implementation provides a complete, production-ready PDF annotation system with real-time collaboration capabilities. It integrates seamlessly with BoardGuru's existing vault-based architecture while providing enterprise-grade security and audit capabilities.