# BoardGuru - Environment Configuration Guide

This guide provides step-by-step instructions for configuring all environment variables required for BoardGuru to function properly.

## 📋 Quick Setup Checklist

- [ ] Supabase database configured
- [ ] SMTP email service configured  
- [ ] Environment variables set locally
- [ ] Environment variables set in Vercel
- [ ] Database migration executed
- [ ] Test registration workflow

---

## 🗃️ Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose organization and enter project details:
   - **Name**: BoardGuru
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project to be created (2-3 minutes)

### 2. Get Database Credentials
Once your project is ready:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys** → **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API Keys** → **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Database Migration
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database-migration-tokens.sql`
3. Paste and run the migration
4. Verify tables are created in **Table Editor**

### 4. Set Up Row Level Security (Optional but Recommended)
1. In **SQL Editor**, copy and run the contents of `supabase-schema.sql`
2. This sets up proper RLS policies for security

---

## 📧 Email Setup (SMTP)

BoardGuru supports multiple email providers. Gmail is recommended for ease of setup.

### Option 1: Gmail (Recommended)

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled

#### Step 2: Generate App Password
1. Go to **Security** → **App passwords**
2. Select app: **Mail**
3. Select device: **Other (custom name)**
4. Enter: "BoardGuru SMTP"
5. Copy the generated 16-character password (save this!)

#### Step 3: Configure Environment Variables
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
ADMIN_EMAIL=your-email@gmail.com
```

### Option 2: Other Providers

**Outlook/Hotmail:**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**Custom SMTP:**
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=your-username
SMTP_PASS=your-password
```

---

## 🔐 Security Configuration

### 1. Generate NEXTAUTH_SECRET
```bash
# Option 1: Use openssl (recommended)
openssl rand -base64 32

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

### 2. Set Application URLs
```bash
# For local development
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# For production (update with your actual Vercel URL)
APP_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app
NEXTAUTH_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app
```

---

## 🤖 AI Configuration (OpenRouter)

You already have an OpenRouter API key. Set it up:

```bash
OPENROUTER_API_KEY=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
```

---

## 📁 Complete Environment Configuration

### Local Development (.env.local)
Create a `.env.local` file in your project root:

```bash
# Database (from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hirendra.vikram@boardguru.ai
SMTP_PASS=your-16-character-app-password
ADMIN_EMAIL=hirendra.vikram@boardguru.ai

# Security
NEXTAUTH_SECRET=your-32-character-secret
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# AI Integration
OPENROUTER_API_KEY=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

# File Handling (optional - these have defaults)
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,docx,pptx,xlsx,txt
```

### Vercel Production Environment
In your Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add each variable from above, but change:
   ```bash
   APP_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app
   NEXTAUTH_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app
   ```

---

## 🧪 Testing Configuration

### 1. Test Database Connection
```bash
npm run dev
```
Check console for database connection errors.

### 2. Test SMTP Configuration
1. Fill out the registration form on your local site
2. Check that emails are sent to admin
3. Verify approval/rejection links work

### 3. Environment Validation
The app will validate environment variables on startup:
- ✅ Green checkmarks = properly configured
- ❌ Red X = missing or invalid configuration

---

## 🚨 Common Issues & Solutions

### Issue: "Invalid API key" error
**Solution**: Check your Supabase keys are correct and match your project.

### Issue: SMTP authentication failed
**Solutions**:
- Ensure 2-factor authentication is enabled on Gmail
- Generate a new app password
- Check username/password for typos
- Verify SMTP host and port

### Issue: Approval links show wrong URL
**Solutions**:
- Set `APP_URL` environment variable in Vercel
- Ensure Vercel deployment is using latest code
- Check that environment variables are applied (redeploy if needed)

### Issue: Database errors
**Solutions**:
- Run the database migration in Supabase SQL Editor
- Check RLS policies are properly configured
- Verify service role key has correct permissions

### Issue: Build failures in Vercel
**Solutions**:
- Ensure all required environment variables are set in Vercel
- Check build logs for specific missing variables
- Redeploy after adding missing environment variables

---

## 🔍 Environment Validation Checklist

Use this checklist to verify your setup:

### Database
- [ ] Supabase project created
- [ ] Database URL and keys copied
- [ ] Migration script executed successfully
- [ ] Tables visible in Supabase dashboard

### Email
- [ ] SMTP credentials configured
- [ ] App password generated (if using Gmail)
- [ ] Test email sent successfully
- [ ] Admin receives registration notifications

### Security
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] APP_URL set to correct domain
- [ ] No sensitive data in client-side variables

### Production
- [ ] All environment variables set in Vercel
- [ ] Vercel deployment successful
- [ ] Production URL configured correctly
- [ ] Test registration workflow end-to-end

---

## 🆘 Support

If you encounter issues:

1. **Check console logs** for specific error messages
2. **Verify environment variables** are spelled correctly
3. **Test locally first** before deploying to production
4. **Check Vercel build logs** for deployment issues

### Debug Commands
```bash
# Test environment loading
npm run dev

# Check environment variables (in development)
console.log(process.env)

# Verify database connection
# (Check browser console after visiting the app)
```

---

## 🎯 Next Steps

After completing environment setup:

1. **Test locally**: Run `npm run dev` and test registration
2. **Deploy to Vercel**: Push code and verify environment variables
3. **Test production**: Complete end-to-end registration workflow
4. **Monitor**: Check logs for any configuration issues

Your BoardGuru registration workflow should now be fully functional! 🎉