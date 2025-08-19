# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoardGuru is an enterprise board management platform built with Next.js, TypeScript, and Tailwind CSS. It provides secure board pack management with AI-powered summarization, interactive analysis, and comprehensive governance features.

**Key Features:**
- User registration with approval workflow
- Secure board pack upload and management
- AI-powered document summarization (text + audio generation)
- Interactive chatbot for board pack analysis
- Role-based access control with audit trails
- Secure export with watermarking
- Enterprise-grade security and compliance

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Update with your Supabase, email, and AI service credentials

3. **Set up Supabase:**
   - Create a new Supabase project
   - Update environment variables with your Supabase URL and keys
   - Run database migrations (when available)

## Common Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript type checking
```

## Technology Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Email:** Nodemailer
- **File Upload:** React Dropzone
- **Forms:** React Hook Form + Zod validation
- **UI Components:** Radix UI + Lucide React icons

## Architecture Notes

### Project Structure
```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   └── admin/             # Admin panel
├── components/            # Reusable components
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   └── ui/                # Base UI components
├── lib/                   # Utility libraries
│   ├── supabase.ts        # Supabase client
│   └── supabase-server.ts # Server-side Supabase
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

### Database Schema
The application uses Supabase with the following main tables:
- `users` - User profiles with roles and approval status
- `board_packs` - Uploaded documents and processing status
- `audit_logs` - Activity tracking and compliance
- `registration_requests` - User registration workflow

### Authentication Flow
1. Users submit registration requests via landing page
2. Requests are stored in database and email sent to admin
3. Admin approves/rejects requests via admin panel
4. Approved users receive credentials and can sign in
5. Role-based access controls what features users can access

### File Upload Process
1. Drag & drop interface with validation
2. Upload to Supabase Storage
3. Trigger AI processing pipeline
4. Generate summaries and audio content
5. Update database with processing status

### Security Features
- Server-side environment variable validation
- Input sanitization and validation with Zod
- CSRF protection via Next.js
- Secure file upload with type validation
- Audit logging for all sensitive actions

## Email Configuration

Registration requests automatically send emails to `hirendra.vikram@boardguru.ai`. Configure SMTP settings in environment variables:

```env
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## Development Notes

- Environment variables are required for full functionality
- Placeholder values are used during build to prevent errors
- All forms use React Hook Form with Zod validation
- Components follow enterprise design patterns
- CSS uses Tailwind utility classes with custom component styles
- TypeScript strict mode is enabled