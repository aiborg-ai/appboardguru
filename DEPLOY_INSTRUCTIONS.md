# 🚀 BoardGuru Database Deployment Instructions

## Quick Start (Recommended)

### Step 1: Deploy Database Schema
1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `deploy-database.sql`
4. Click **Run** to execute the complete deployment
5. Look for the success message at the end

### Step 2: Verify Deployment
Check that these tables were created:
- `organizations`
- `organization_members` 
- `organization_invitations`
- `organization_features`
- `_migrations`

### Step 3: Test Organization Creation
```sql
-- Test query - should work without errors
SELECT * FROM organizations LIMIT 1;
```

---

## Alternative: Manual Step-by-Step Deployment

If you prefer to run migrations individually:

### 1. Core Organizations
```sql
-- Run: database/migrations/001-organizations-core.sql
```

### 2. Asset Permissions (Optional - for advanced features)
```sql  
-- Run: database/migrations/002-asset-permissions.sql
```

### 3. Security & Audit (Optional - for compliance)
```sql
-- Run: database/migrations/003-audit-security.sql
```

### 4. RLS Policies (Optional - already included in deploy-database.sql)
```sql
-- Run: database/migrations/004-rls-policies.sql
```

---

## Troubleshooting

### "relation does not exist" Error
- **Cause**: Trying to run hotfix before main deployment
- **Solution**: Run `deploy-database.sql` first

### "permission denied" Error
- **Cause**: Insufficient database permissions
- **Solution**: Ensure you're using the Supabase dashboard as project owner

### "duplicate key value" Error
- **Cause**: Running migration twice
- **Solution**: Check `_migrations` table to see what's already been run

---

## What Gets Created

### Database Tables
- **organizations**: Company/organization data
- **organization_members**: User memberships with roles
- **organization_invitations**: Email invitation system
- **organization_features**: Plan limits and features

### Security Features  
- **Row Level Security**: Multi-tenant data isolation
- **Triggers**: Ownership validation and data integrity
- **Indexes**: Query performance optimization
- **Policies**: Fine-grained access control

### User Roles
- **Owner**: Full control, can transfer ownership
- **Admin**: Manage members and settings
- **Member**: Access organization board packs
- **Viewer**: Read-only access

---

## Next Steps After Database Deployment

1. **Install Dependencies**:
   ```bash
   npm install @tanstack/react-query @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast
   ```

2. **Update Environment Variables**:
   ```bash
   # Add to .env.local
   RATE_LIMIT_ENABLED=true
   IP_BLOCKING_ENABLED=true
   AUDIT_LOGGING_ENABLED=true
   ```

3. **Deploy Application**: 
   - Your Next.js application should now work with the new multi-tenant system
   - Users can create organizations and invite members
   - Board packs are now organization-scoped

4. **Test the System**:
   - Create an organization
   - Invite a member
   - Upload a board pack
   - Verify permissions work correctly

---

## Support

If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Verify your user has proper database permissions
3. Ensure all environment variables are set correctly
4. Review the implementation guide: `MULTI_TENANT_IMPLEMENTATION_GUIDE.md`

The deployment script is designed to be safe to run multiple times - it will skip operations that have already been completed.

🎉 **Once deployed, your BoardGuru application will be a fully functional multi-tenant SaaS platform!**