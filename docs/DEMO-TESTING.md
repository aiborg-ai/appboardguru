# 🎯 Demo Testing Guide - BoardGuru

## 🚀 Quick Setup

### Step 1: Run Demo Data Setup
1. Go to your **Supabase dashboard** → SQL Editor
2. Run the contents of `demo-data.sql`
3. This creates demo users, board packs, and test data

### Step 2: Test the Live Application

**Demo Accounts Available:**

| Email | Role | Status | Use Case |
|-------|------|--------|----------|
| `demo.director@boardguru.ai` | Director | ✅ Approved | Full platform testing |
| `admin@boardguru.ai` | Admin | ✅ Approved | Admin features testing |
| `jane.smith@techcorp.com` | Board Member | ⏳ Pending | Test approval workflow |

## 🧪 Testing Scenarios

### Scenario 1: Registration & Approval Workflow
1. **Go to your Vercel URL** (once deployed)
2. **Click "Request Access"**
3. **Fill out the form** with test data
4. **Check email** (hirendra.vikram@boardguru.ai) for approval link
5. **Click APPROVE** in email
6. **Verify** user can now access dashboard

### Scenario 2: Dashboard & Board Packs
1. **Sign in** with `demo.director@boardguru.ai`
2. **View demo board packs:**
   - Q4 2024 Board Package
   - Strategic Planning Session Materials
3. **Test AI summarization** features
4. **Try the AI chat** functionality

### Scenario 3: Admin Features
1. **Sign in** with `admin@boardguru.ai` 
2. **View pending registrations**
3. **Test approval/rejection** from admin panel
4. **Check audit logs**

## 🔗 Important URLs

- **Production App**: `https://your-app.vercel.app` (get from Vercel)
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Admin Email**: hirendra.vikram@boardguru.ai

## ⚡ Quick Test Commands

**Check if demo data exists:**
```sql
SELECT email, status FROM registration_requests WHERE email LIKE '%demo%';
SELECT email, role, status FROM users WHERE email LIKE '%demo%';
```

**Reset demo data (if needed):**
```sql
DELETE FROM registration_requests WHERE email LIKE '%demo%';
DELETE FROM users WHERE email LIKE '%demo%';
-- Then re-run demo-data.sql
```

## 🐛 Troubleshooting

**If registration doesn't work:**
- Check Vercel environment variables are set
- Verify SMTP credentials are working
- Check Supabase RLS policies allow inserts

**If email approval fails:**
- Ensure APP_URL points to your Vercel domain
- Check email settings in Vercel env vars
- Verify approval tokens are being generated

**If login fails:**
- Make sure Supabase Auth is configured
- Check if user exists in both auth.users and public.users
- Verify RLS policies allow user data access

## ✅ Success Criteria

After testing, you should be able to:
- [x] Submit registration requests
- [x] Receive approval emails with working links
- [x] Log in with demo accounts
- [x] View and interact with demo board packs
- [x] Use AI summarization features
- [x] See audit trails of activities

## 🎉 Ready for Production!

Once all tests pass, your BoardGuru platform is ready for real users!