# Supabase Setup Guide for AppBoardGuru

## Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from the API settings

### 2. Run Database Schema
1. Open the Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` 
4. Click "Run" to create all tables, policies, and functions

### 3. Configure Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 4. Set Up Authentication
The schema includes automatic user profile creation when users sign up through Supabase Auth.

## Database Tables Overview

### Core Tables
- **users** - Extended user profiles with roles and approval workflow
- **registration_requests** - Handles user registration approval process  
- **board_packs** - Document/file management with processing pipeline
- **audit_logs** - Activity tracking and security auditing

### User Roles
- **pending** - New users awaiting approval
- **viewer** - Can view approved content
- **admin** - Can manage users and content
- **director** - Full administrative access

### Security Features
- Row Level Security (RLS) enabled on all tables
- Role-based access control
- File upload permissions
- Audit logging for compliance

## File Storage
- Board pack files stored in `board-packs` bucket
- Automatic file access control based on user roles
- Support for PDF, Word, PowerPoint, Excel documents

## Next Steps
1. Run the schema in Supabase
2. Create your first admin user
3. Test the registration flow
4. Upload your first board pack

## Troubleshooting
- Ensure RLS policies are enabled
- Check user roles are correctly assigned
- Verify storage bucket permissions
- Review audit logs for access issues