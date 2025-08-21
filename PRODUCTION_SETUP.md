# Production Configuration Guide

## Environment Variables for Production Deployment

To ensure password setup links work correctly in production, make sure these environment variables are properly configured:

### Critical URL Configuration
```bash
# Your production domain (required for magic links)
APP_URL=https://your-production-domain.com
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXTAUTH_URL=https://your-production-domain.com

# For Vercel deployments, VERCEL_URL is automatically set
# But APP_URL takes priority if explicitly set
```

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Email Configuration
```bash
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-email@gmail.com
SMTP_PASS=your-app-password
```

## Deployment Platform Specific Instructions

### Vercel Deployment
1. Set all environment variables in the Vercel dashboard
2. Ensure `APP_URL` is set to your production domain
3. If using a custom domain, update `APP_URL` after domain setup

### Other Platforms (Heroku, Railway, etc.)
1. Set all environment variables in your platform's config
2. Ensure `APP_URL` matches your production domain exactly
3. Include protocol (https://) in the URL

## Troubleshooting Magic Link Issues

### Issue: "Invalid or expired magic link"
**Cause**: Incorrect `APP_URL` configuration or Supabase URL mismatch
**Solution**: 
1. Verify `APP_URL` matches your production domain exactly
2. Check Supabase project URL configuration
3. Ensure both development and production use same Supabase project

### Issue: Magic link redirects to wrong domain
**Cause**: Environment variable not set or incorrect
**Solution**:
1. Set `APP_URL` environment variable in production
2. Restart your deployment after setting variables
3. Test with a new registration approval

### Issue: Magic link works in development but not production
**Cause**: Missing production environment variables
**Solution**:
1. Copy all environment variables from development to production
2. Update URLs from localhost to production domain
3. Verify SMTP configuration for email delivery

## Testing Checklist

Before deploying to production:
- [ ] All environment variables set correctly
- [ ] `APP_URL` points to production domain
- [ ] SMTP configuration tested
- [ ] Magic link generation tested locally
- [ ] OTP code generation working
- [ ] Password setup page loads correctly

## Security Notes

- Magic links expire in 1 hour for security
- OTP codes expire in 24 hours for first-time login
- Always use HTTPS in production for secure link transmission
- Regularly rotate SMTP credentials and Supabase keys