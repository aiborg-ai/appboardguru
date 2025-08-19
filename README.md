# BoardGuru - Enterprise Board Management Platform

A secure, AI-powered board pack management platform with intelligent summarization, interactive analysis, and comprehensive governance features.

## 🚀 Features

- **User Registration with Approval Workflow** - Email-based approval system
- **Secure Board Pack Upload** - Multi-format support with drag & drop
- **AI-Powered Summarization** - Text and audio generation capabilities
- **Interactive Chatbot** - Board pack analysis and Q&A
- **Role-Based Access Control** - Enterprise security with audit trails
- **Email Notifications** - Professional approval/rejection workflow
- **Beautiful UI** - Modern, responsive design with Tailwind CSS

## 🛠️ Tech Stack

- **Framework:** Next.js 15 with TypeScript
- **Styling:** Tailwind CSS v3
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Email:** Nodemailer with Google Workspace
- **AI:** Claude/OpenAI integration ready
- **Deployment:** Vercel-optimized

## 🔧 Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration  
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@domain.com
SMTP_PASS=your_app_password

# Security
NEXTAUTH_SECRET=your_secret_key
APP_URL=https://your-domain.vercel.app
```

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/appboardguru)

## 📧 Email Approval Workflow

1. Users submit registration requests
2. Admin receives email with **APPROVE** / **REJECT** buttons  
3. One-click approval/rejection with automatic user notifications
4. Beautiful confirmation pages with detailed feedback

## 🔐 Security Features

- Cryptographically signed approval tokens
- Row-level security with Supabase
- Enterprise-grade audit trails
- Secure file upload with validation
- Role-based access control

## 🏗️ Development

```bash
npm install
npm run dev
```

Built with ❤️ using Claude Code (claude.ai/code)