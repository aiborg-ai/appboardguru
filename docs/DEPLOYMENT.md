# 🚀 BoardGuru Deployment Guide

## Quick Deploy to Vercel

### Method 1: GitHub + Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   # Create a new repository on GitHub
   git remote add origin https://github.com/yourusername/boardguru.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy with Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy!

### Method 2: Vercel CLI

1. **Login to Vercel:**
   ```bash
   npx vercel login
   ```

2. **Deploy:**
   ```bash
   npx vercel --prod
   ```

## Environment Variables Setup

### Required Environment Variables:

```env
# Supabase (from your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Email Configuration
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hirendra.vikram@boardguru.ai
SMTP_PASS=your-google-app-password

# Security
NEXTAUTH_SECRET=boardguru-secure-secret-key-2025
APP_URL=https://your-app.vercel.app

# AI (Optional - for future features)
ANTHROPIC_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key
```

### Setting Environment Variables in Vercel:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable above
4. Redeploy the application

## Database Setup

1. **Create Supabase Project:** [supabase.com](https://supabase.com)
2. **Run Database Setup SQL:** Use the SQL in `database-setup-simple.sql`
3. **Configure RLS Policies:** Follow the database setup guide

## Email Configuration

1. **Google Workspace App Password:**
   - Enable 2-Step Verification
   - Generate App Password for "Mail"
   - Use the 16-character password in `SMTP_PASS`

2. **Test Email Flow:**
   - Submit a registration
   - Check email for approve/reject buttons
   - Verify production URLs work from email

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database schema created
- [ ] Email authentication working
- [ ] Registration workflow tested
- [ ] Approve/reject buttons work from email
- [ ] Beautiful response pages display correctly
- [ ] SSL certificate active
- [ ] Custom domain configured (optional)

## Troubleshooting

### Common Issues:

1. **Email not sending:** Check SMTP credentials and app password
2. **Database errors:** Verify Supabase URL/keys and RLS policies  
3. **Approval links broken:** Confirm `APP_URL` matches deployed URL
4. **Build failures:** Check all environment variables are set

### Support:

Built with Claude Code - for issues, check the comprehensive error handling and logging implemented throughout the application.

---

🎉 **Your BoardGuru platform is ready for enterprise use!**