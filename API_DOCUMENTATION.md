# BoardGuru - API Documentation

**Version:** 1.0.2  
**Base URL:** `https://boardguru.vercel.app/api`  
**Authentication:** Bearer JWT tokens via Supabase Auth  

---

## Authentication

All API endpoints require authentication unless specified otherwise. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST `/auth/verify-otp`
Verify OTP code for first-time login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "tempToken": "temp_jwt_token",
  "expiresAt": "2025-08-21T12:00:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid or expired OTP code",
  "timestamp": "2025-08-21T11:30:00Z"
}
```

#### POST `/auth/resend-otp`
Resend OTP code to user's email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Rate Limit:** 3 requests per 15 minutes per email

---

## User Management

#### POST `/send-registration-email`
Submit user registration request (public endpoint).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "John Doe",
  "company": "Acme Corp",
  "position": "Board Director"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration request submitted successfully"
}
```

#### POST `/approve-registration`
Approve user registration (admin only).

**Request Body:**
```json
{
  "token": "approval_token",
  "role": "director"
}
```

#### POST `/reject-registration`
Reject user registration (admin only).

**Request Body:**
```json
{
  "token": "rejection_token",
  "reason": "Does not meet requirements"
}
```

---

## User Activity & Audit

#### GET `/user/activity`
Retrieve user's activity logs with pagination and filtering.

**Query Parameters:**
- `limit` (number, default: 50): Number of records per page
- `offset` (number, default: 0): Pagination offset
- `eventType` (string, optional): Filter by event type
- `severity` (string, optional): Filter by severity level
- `outcome` (string, optional): Filter by outcome
- `fromDate` (ISO string, optional): Start date filter
- `toDate` (ISO string, optional): End date filter
- `search` (string, optional): Search in descriptions

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "uuid",
        "timestamp": "2025-08-21T10:30:00Z",
        "type": "authentication",
        "category": "user_action",
        "action": "login_success",
        "description": "User signed in successfully",
        "outcome": "success",
        "severity": "low",
        "details": {
          "ipAddress": "192.168.1.1",
          "userAgent": "Mozilla/5.0 Chrome/91.0",
          "endpoint": "/api/auth/signin",
          "responseStatus": 200,
          "responseTime": 245
        },
        "metadata": {},
        "sessionId": "session_uuid"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1250,
      "hasMore": true
    }
  }
}
```

#### GET `/user/activity/export`
Export user's activity data in CSV or JSON format.

**Query Parameters:**
- `format` (enum: 'csv' | 'json', default: 'csv'): Export format
- `fromDate` (ISO string, optional): Start date filter
- `toDate` (ISO string, optional): End date filter
- `eventType` (string, optional): Filter by event type
- `includeMetadata` (boolean, default: false): Include technical metadata

**Response (200 OK):**
Returns file download with appropriate headers:
- **CSV**: `Content-Type: text/csv`
- **JSON**: `Content-Type: application/json`

---

## Organization Management

#### GET `/organizations`
List user's accessible organizations.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "org_uuid",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "description": "Leading technology company",
      "logoUrl": "https://storage.url/logo.png",
      "website": "https://acme.com",
      "industry": "Technology",
      "organizationSize": "large",
      "createdAt": "2025-08-01T00:00:00Z",
      "isActive": true,
      "memberRole": "admin",
      "memberCount": 15
    }
  ]
}
```

#### POST `/organizations`
Create new organization.

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "description": "Organization description",
  "website": "https://example.com",
  "industry": "Finance",
  "organizationSize": "medium"
}
```

#### GET `/organizations/check-slug`
Validate organization slug availability.

**Query Parameters:**
- `slug` (string, required): Slug to validate

**Response (200 OK):**
```json
{
  "available": true,
  "suggestions": ["alt-slug-1", "alt-slug-2"]
}
```

#### GET `/organizations/[id]/members`
Get organization members and their roles.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_uuid",
      "email": "member@example.com",
      "fullName": "Jane Smith",
      "role": "director",
      "joinedAt": "2025-08-01T00:00:00Z",
      "lastActive": "2025-08-21T10:00:00Z",
      "status": "active"
    }
  ]
}
```

---

## Vault Management

#### GET `/vaults`
List user's accessible vaults.

**Query Parameters:**
- `organizationId` (UUID, optional): Filter by organization

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "vault_uuid",
      "organizationId": "org_uuid",
      "name": "Q3 Board Pack",
      "description": "Third quarter board materials",
      "createdAt": "2025-08-01T00:00:00Z",
      "accessLevel": "restricted",
      "assetCount": 12,
      "lastModified": "2025-08-20T15:30:00Z",
      "userRole": "editor"
    }
  ]
}
```

#### POST `/vaults`
Create new vault.

**Request Body:**
```json
{
  "organizationId": "org_uuid",
  "name": "Q4 Board Pack",
  "description": "Fourth quarter materials",
  "accessLevel": "restricted",
  "settings": {
    "allowDownload": true,
    "allowAnnotations": true,
    "expirationDate": "2025-12-31T23:59:59Z"
  }
}
```

#### POST `/vaults/[id]/invite`
Invite users to vault with specific permissions.

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "viewer",
  "message": "You've been invited to access Q4 Board Pack",
  "expirationDate": "2025-09-21T23:59:59Z"
}
```

#### GET `/vaults/[id]/assets`
List assets in vault.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Assets per page
- `search` (string, optional): Search in asset names

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "asset_uuid",
        "name": "Financial Report Q3.pdf",
        "description": "Quarterly financial analysis",
        "fileSize": 2048576,
        "fileType": "pdf",
        "uploadedAt": "2025-08-15T10:00:00Z",
        "uploadedBy": "user_uuid",
        "processingStatus": "completed",
        "aiSummary": "Key financial metrics and analysis...",
        "annotationCount": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

---

## Asset Management

#### POST `/assets/upload`
Upload new asset file.

**Request:** Multipart form data
- `file`: File to upload
- `vaultId`: Target vault UUID
- `name`: Asset name (optional)
- `description`: Asset description (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "asset_uuid",
    "name": "uploaded-file.pdf",
    "fileSize": 1024000,
    "processingStatus": "processing",
    "uploadUrl": "https://storage.url/path"
  }
}
```

#### GET `/assets/[id]`
Get asset details and metadata.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "asset_uuid",
    "vaultId": "vault_uuid",
    "name": "Board Report.pdf",
    "description": "Monthly board report",
    "filePath": "storage/path/file.pdf",
    "fileSize": 2048576,
    "fileType": "pdf",
    "mimeType": "application/pdf",
    "uploadedBy": "user_uuid",
    "createdAt": "2025-08-15T10:00:00Z",
    "processingStatus": "completed",
    "aiSummary": "Executive summary of key findings...",
    "aiInsights": {
      "keyTopics": ["revenue", "growth", "strategy"],
      "sentiment": "positive",
      "urgency": "medium"
    },
    "accessLevel": "restricted",
    "downloadCount": 15,
    "lastAccessed": "2025-08-21T09:30:00Z"
  }
}
```

#### GET `/assets/[id]/download`
Download asset file securely.

**Response (200 OK):**
Returns file stream with appropriate headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"
Content-Length: 2048576
```

#### POST `/assets/[id]/share`
Generate secure sharing link for asset.

**Request Body:**
```json
{
  "expirationDate": "2025-09-21T23:59:59Z",
  "permissions": ["view", "download"],
  "recipientEmail": "recipient@example.com"
}
```

---

## Annotation System

#### GET `/assets/[id]/annotations`
Get all annotations for an asset.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `resolved` (boolean, optional): Filter by resolution status

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "annotation_uuid",
      "assetId": "asset_uuid",
      "createdBy": "user_uuid",
      "pageNumber": 1,
      "annotationType": "highlight",
      "content": "Important financial metric",
      "position": {
        "boundingRect": {
          "x1": 100, "y1": 200,
          "x2": 300, "y2": 220
        }
      },
      "style": {
        "color": "#ffff00",
        "opacity": 0.3
      },
      "createdAt": "2025-08-20T14:30:00Z",
      "isResolved": false,
      "replyCount": 3
    }
  ]
}
```

#### POST `/assets/[id]/annotations`
Create new annotation.

**Request Body:**
```json
{
  "pageNumber": 1,
  "annotationType": "highlight",
  "content": "This section needs review",
  "position": {
    "boundingRect": {
      "x1": 100, "y1": 200,
      "x2": 300, "y2": 220
    }
  },
  "style": {
    "color": "#ffff00",
    "opacity": 0.3
  }
}
```

#### GET `/assets/[id]/annotations/[annotationId]/replies`
Get annotation discussion thread.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "reply_uuid",
      "annotationId": "annotation_uuid",
      "createdBy": "user_uuid",
      "content": "I agree, this needs clarification",
      "createdAt": "2025-08-20T15:00:00Z",
      "author": {
        "fullName": "Jane Smith",
        "avatarUrl": "https://avatar.url"
      }
    }
  ]
}
```

---

## AI & Processing

#### POST `/chat`
AI chat endpoint for document analysis and questions.

**Request Body:**
```json
{
  "message": "What are the key financial highlights?",
  "scope": {
    "type": "document",
    "id": "asset_uuid"
  },
  "model": "claude-3-sonnet",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant", 
      "content": "Previous response"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "response": "Based on the financial report, the key highlights include...",
    "sources": [
      {
        "assetId": "asset_uuid",
        "page": 2,
        "relevance": 0.95
      }
    ],
    "usage": {
      "promptTokens": 1500,
      "completionTokens": 800,
      "totalTokens": 2300
    }
  }
}
```

#### POST `/summarize-document`
Generate AI summary of uploaded document.

**Request Body:**
```json
{
  "assetId": "asset_uuid",
  "summaryType": "executive",
  "includeAudio": true,
  "language": "en"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": "Executive summary of the document...",
    "keyPoints": [
      "Revenue increased by 15%",
      "New market expansion",
      "Strategic partnerships"
    ],
    "audioUrl": "https://storage.url/audio.mp3",
    "processingTime": 3500,
    "confidence": 0.92
  }
}
```

#### GET `/web-search`
AI-powered web search for additional context.

**Query Parameters:**
- `query` (string, required): Search query
- `scope` (string, optional): Search scope context
- `limit` (number, default: 10): Number of results

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "title": "Industry Analysis Report",
        "url": "https://example.com/report",
        "snippet": "Recent market trends show...",
        "relevance": 0.89,
        "source": "Reuters"
      }
    ],
    "query": "technology sector growth 2025",
    "resultCount": 10
  }
}
```

---

## Invitation Management

#### GET `/invitations`
List organization invitations.

**Query Parameters:**
- `status` (string, optional): Filter by invitation status
- `organizationId` (UUID, optional): Filter by organization

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "invitation_uuid",
      "organizationId": "org_uuid",
      "email": "invitee@example.com",
      "role": "director",
      "status": "pending",
      "invitedBy": "admin_uuid",
      "invitedAt": "2025-08-20T10:00:00Z",
      "expiresAt": "2025-09-20T10:00:00Z",
      "organizationName": "Acme Corp"
    }
  ]
}
```

#### POST `/invitations`
Send organization invitation.

**Request Body:**
```json
{
  "organizationId": "org_uuid",
  "email": "newmember@example.com",
  "role": "director",
  "message": "Welcome to our board",
  "expirationHours": 168
}
```

#### POST `/invitations/validate`
Validate invitation token.

**Request Body:**
```json
{
  "token": "invitation_token"
}
```

#### POST `/invitations/accept`
Accept organization invitation.

**Request Body:**
```json
{
  "token": "invitation_token"
}
```

---

## Board Member Management

#### GET `/boardmates`
List board members.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "member_uuid",
      "email": "director@example.com",
      "fullName": "John Director",
      "role": "director",
      "company": "Acme Corp",
      "position": "CEO",
      "joinedAt": "2025-08-01T00:00:00Z",
      "lastActive": "2025-08-21T09:00:00Z",
      "status": "active",
      "avatarUrl": "https://avatar.url"
    }
  ]
}
```

#### POST `/boardmates/invite`
Invite new board member.

**Request Body:**
```json
{
  "email": "newdirector@example.com",
  "role": "director",
  "organizationId": "org_uuid",
  "message": "Board invitation message"
}
```

---

## Dashboard Analytics

#### GET `/dashboard/metrics`
Get dashboard performance metrics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalAssets": 156,
    "totalVaults": 12,
    "activeUsers": 25,
    "documentsProcessed": 89,
    "aiInteractions": 234,
    "storageUsed": "2.4 GB",
    "lastUpdated": "2025-08-21T11:00:00Z"
  }
}
```

#### GET `/dashboard/activity`
Get recent dashboard activity feed.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "activity_uuid",
      "type": "document_upload",
      "description": "New financial report uploaded",
      "timestamp": "2025-08-21T10:30:00Z",
      "user": "John Doe",
      "icon": "upload",
      "color": "blue"
    }
  ]
}
```

#### GET `/dashboard/insights`
Get AI-generated insights for dashboard.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "trend",
        "title": "Document Upload Trend",
        "description": "Upload activity increased 25% this month",
        "confidence": 0.87,
        "actionable": true,
        "recommendation": "Consider automated processing rules"
      }
    ],
    "generatedAt": "2025-08-21T11:00:00Z"
  }
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-21T11:30:00Z",
  "path": "/api/endpoint",
  "details": {
    "field": "Specific field error"
  }
}
```

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (duplicate)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    "email: Invalid email format",
    "password: Must be at least 8 characters"
  ],
  "timestamp": "2025-08-21T11:30:00Z"
}
```

---

## Rate Limiting

### Default Limits
- **Authentication**: 5 requests per 15 minutes per IP
- **File Upload**: 10 requests per hour per user
- **AI Chat**: 50 requests per hour per user
- **API Calls**: 1000 requests per hour per user

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1692624000
```

---

## Webhooks (Future)

### Available Events
- `user.approved`: User registration approved
- `document.processed`: AI processing completed
- `annotation.created`: New annotation added
- `vault.shared`: Vault shared with user

### Webhook Format
```json
{
  "event": "user.approved",
  "data": {
    "userId": "user_uuid",
    "email": "user@example.com",
    "approvedAt": "2025-08-21T11:00:00Z"
  },
  "timestamp": "2025-08-21T11:00:00Z",
  "signature": "webhook_signature"
}
```

---

## SDK Integration (Future)

### JavaScript SDK Example
```javascript
import { BoardGuruSDK } from '@boardguru/sdk';

const client = new BoardGuruSDK({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.boardguru.com'
});

// Upload document
const asset = await client.assets.upload({
  file: fileBuffer,
  vaultId: 'vault_uuid',
  name: 'Board Report.pdf'
});

// Get AI summary
const summary = await client.ai.summarize(asset.id);
```

---

*This API documentation covers all available endpoints in BoardGuru v1.0.2. For questions or support, contact the development team.*