# Test Accounts Documentation

## ✅ All Test Accounts Are Now Fully Set Up!

All test accounts have been created with full authentication capabilities and proper permissions. You can log in with any of these accounts to test different user roles and functionality.

## 🔐 Test Account Credentials

### 1. Test Director (Owner)
- **Email**: `test.director@appboardguru.com`
- **Password**: `TestDirector123!`
- **Role**: Owner
- **Organization**: Test Board Organization
- **Permissions**: Full admin access, can manage everything
- **Use Case**: Testing owner/admin functionality, board management

### 2. Admin User
- **Email**: `admin.user@appboardguru.com`
- **Password**: `AdminUser123!`
- **Role**: Admin
- **Organization**: Test Board Organization
- **Permissions**: Admin access, can manage users and content
- **Use Case**: Testing admin functions, user management

### 3. Board Member
- **Email**: `board.member@appboardguru.com`
- **Password**: `BoardMember123!`
- **Role**: Member
- **Organization**: Test Board Organization
- **Permissions**: Standard member access
- **Use Case**: Testing regular board member functionality

### 4. Test User
- **Email**: `test.user@appboardguru.com`
- **Password**: `TestUser123!`
- **Role**: Member
- **Organization**: Test Board Organization
- **Permissions**: Standard member access
- **Use Case**: General testing, bug reproduction

### 5. Demo Director
- **Email**: `demo.director@appboardguru.com`
- **Password**: `DemoDirector123!`
- **Role**: Owner
- **Organization**: Demo Board Organization
- **Permissions**: Full admin access for demo org
- **Use Case**: Demo presentations, isolated testing

## 🎯 What Each Account Can Do

### Owner Accounts (test.director, demo.director)
- ✅ Create and manage boards
- ✅ Invite new members
- ✅ Manage organization settings
- ✅ Create and delete vaults
- ✅ Upload and delete any assets
- ✅ Approve registrations
- ✅ Full system access

### Admin Account (admin.user)
- ✅ Manage board members
- ✅ Create vaults
- ✅ Upload and manage assets
- ✅ Moderate content
- ✅ View all organization data
- ✅ Cannot change organization settings

### Member Accounts (board.member, test.user)
- ✅ View board information
- ✅ Upload assets to allowed vaults
- ✅ Participate in discussions
- ✅ View shared documents
- ✅ Cannot delete others' content
- ✅ Cannot invite new members

## 🗂️ Organization Structure

### Test Board Organization
- **Slug**: `test-board-org`
- **Members**: 4 users (test.director, admin.user, board.member, test.user)
- **Vaults**: 
  - Board Documents
  - Financial Reports
  - Legal & Compliance
- **Boards**: Main Board
- **Committees**: Audit, Compensation, Governance

### Demo Board Organization
- **Slug**: `demo-board-org`
- **Members**: 1 user (demo.director)
- **Vaults**: Demo Documents
- **Purpose**: Isolated environment for demos

## 🚀 Quick Setup Instructions

### If Test Users Don't Exist Yet:

1. **Run the setup script**:
   ```bash
   npx tsx src/scripts/setup-all-test-users.ts
   ```

2. **Fix database schema** (run in Supabase SQL Editor):
   ```sql
   -- Copy contents of database/fix-test-users-schema.sql
   ```

### To Verify Setup:

1. **Check authentication**:
   ```bash
   npx tsx src/scripts/test-user-auth.ts
   ```

2. **Test login in the app**:
   - Go to `/auth/signin`
   - Use any test account credentials
   - Should authenticate successfully

## 🐛 Testing Different Scenarios

### Testing Bug Reports
When creating a bug report, use the appropriate test account based on the bug:
- **Permission issues**: Use different role accounts to test
- **Owner-only features**: Use test.director@appboardguru.com
- **Member limitations**: Use board.member@appboardguru.com
- **Cross-organization**: Use demo.director for isolation

### Testing Features
- **File Upload**: Any account can upload to their vaults
- **Board Creation**: Only owner accounts
- **Member Invitation**: Owner and admin accounts
- **Asset Deletion**: Owner and admin only
- **Vault Access**: All users have access to org vaults

## 🔧 Troubleshooting

### If login fails:
1. Verify the account exists in Supabase Auth
2. Check password is correct (case-sensitive)
3. Run setup script again to reset password

### If permissions are wrong:
1. Check organization_members table for role
2. Verify vault_members for vault access
3. Run the fix-test-users-schema.sql script

### Reset a test account:
```bash
# Reset specific user
npx tsx src/scripts/reset-test-user.ts test.director@appboardguru.com
```

## 📝 Important Notes

1. **Passwords are case-sensitive** - Use exactly as shown
2. **Accounts persist** - Once created, they remain in Supabase
3. **Safe for testing** - These accounts are isolated for testing
4. **Full functionality** - All features work with these accounts
5. **Organization-scoped** - Each org's data is isolated

## 🔄 Maintenance Scripts

### Update all test users:
```bash
npx tsx src/scripts/setup-all-test-users.ts
```

### Check user status:
```bash
npx tsx src/scripts/check-test-users.ts
```

### Reset permissions:
```sql
-- Run fix-test-users-schema.sql in Supabase
```

## ✅ Verification Checklist

- [x] All 5 test accounts created in Supabase Auth
- [x] User profiles exist in database
- [x] Organization memberships configured
- [x] Vault access permissions set
- [x] Authentication tested and working
- [x] Proper roles assigned (owner, admin, member)
- [x] Test data available for each account

---

**Last Updated**: August 29, 2025
**Status**: ✅ All test accounts fully operational
**Next Step**: Use any account to test your features!