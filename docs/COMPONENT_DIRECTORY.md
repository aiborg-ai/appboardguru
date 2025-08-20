# BoardGuru - Component Directory

## Quick Reference Guide for Development Communication

This document provides a quick reference for all components, utilities, and key files in the BoardGuru project. Use these exact names when communicating about development tasks.

---

## 📁 File Structure Overview

```
appboardguru/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   ├── components/             # React components
│   ├── lib/                    # Core utilities
│   ├── config/                 # Configuration
│   └── utils/                  # Helper functions
├── database files (.sql)       # Database schemas
└── configuration files         # Environment, package.json, etc.
```

---

## 🎨 UI Components (`/src/components/ui/`)

| Component | File | Purpose | Usage Example |
|-----------|------|---------|---------------|
| `Button` | `button.tsx` | All button variants | `<Button variant="primary">Click me</Button>` |
| `Card` | `card.tsx` | Container layouts | `<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>` |
| `Badge` | `badge.tsx` | Status indicators | `<Badge variant="default">Approved</Badge>` |
| `Input` | `input.tsx` | Form text inputs | `<Input placeholder="Enter email" />` |
| `Textarea` | `textarea.tsx` | Multi-line inputs | `<Textarea placeholder="Enter message" />` |
| `Select` | `select.tsx` | Dropdown menus | `<Select>...</Select>` |
| `Checkbox` | `checkbox.tsx` | Form checkboxes | `<Checkbox checked={true} />` |
| `ScrollArea` | `scroll-area.tsx` | Custom scrollable areas | `<ScrollArea>...</ScrollArea>` |
| `ResponsePage` | `ResponsePage.tsx` | Generic result pages | Used for approval results |

---

## 🏗️ Feature Components (`/src/components/`)

### Forms Directory (`/src/components/forms/`)
| Component | File | Purpose |
|-----------|------|---------|
| `RegistrationModal` | `RegistrationModal.tsx` | User registration form modal |

### Layout Components (Future)
| Component | File | Purpose |
|-----------|------|---------|
| `Header` | `header.tsx` | Main navigation header |
| `Sidebar` | `sidebar.tsx` | Dashboard sidebar |
| `Footer` | `footer.tsx` | Site footer |

### Error Handling
| Component | File | Purpose |
|-----------|------|---------|
| `ErrorBoundary` | `ErrorBoundary.tsx` | React error boundary with recovery |
| `APIErrorBoundary` | `ErrorBoundary.tsx` | API-specific error handling |

---

## 📱 Page Components (`/src/app/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| `HomePage` | `page.tsx` | `/` | Landing page with features |
| `DemoPage` | `demo/page.tsx` | `/demo` | Live demo environment |
| `SignInPage` | `auth/signin/page.tsx` | `/auth/signin` | User authentication |
| `DashboardPage` | `dashboard/page.tsx` | `/dashboard` | Main user dashboard |
| `ApprovalResultPage` | `approval-result/page.tsx` | `/approval-result` | Registration result display |

---

## 🔧 Core Libraries (`/src/lib/`)

| Utility | File | Purpose | Key Functions |
|---------|------|---------|---------------|
| Database | `supabase.ts` | Database client | `supabase` client instance |
| AI Integration | `openrouter.ts` | AI API client | `makeOpenRouterRequest()` |
| Security | `security.ts` | Security utilities | `generateSecureApprovalToken()`, `sanitizeInput()`, `RateLimiter` |
| API Responses | `api-response.ts` | Standardized API responses | `createSuccessResponse()`, `createErrorResponse()` |
| Utils | `utils.ts` | General utilities | `cn()` for className merging |

---

## ⚙️ Configuration (`/src/config/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `environment.ts` | Environment variable validation | `env`, `getAppUrl()`, `isProduction()` |

---

## 🛠️ Utility Functions (`/src/utils/`)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `url.ts` | URL generation utilities | `generateApprovalUrls()` |

---

## 🗃️ Database Files

| File | Purpose | Contains |
|------|---------|----------|
| `supabase-schema.sql` | Main database schema | Tables, RLS policies, indexes |
| `demo-data.sql` | Demo data insertion | Sample users and board packs |
| `database-setup.sql` | Initial setup | Legacy setup file |

---

## 🔗 API Routes (`/src/app/api/`)

| Endpoint | File | Method | Purpose |
|----------|------|--------|---------|
| `/api/send-registration-email` | `send-registration-email/route.ts` | POST | Submit registration request |
| `/api/approve-registration` | `approve-registration/route.ts` | GET | Approve user registration |
| `/api/reject-registration` | `reject-registration/route.ts` | GET | Reject user registration |
| `/api/chat` | `chat/route.ts` | POST | AI chatbot interactions |
| `/api/summarize-document` | `summarize-document/route.ts` | POST | Document summarization |

---

## 📋 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `next.config.js` | Next.js configuration |
| `.env.local` | Local environment variables |

---

## 🎯 Communication Examples

### When Discussing Components:
- ✅ "Update the `RegistrationModal` component to include validation"
- ✅ "The `Button` component needs a new variant"
- ✅ "Add error handling to the `DemoPage`"

### When Discussing Files:
- ✅ "Check the environment configuration in `environment.ts`"
- ✅ "Update the database schema in `supabase-schema.sql`"
- ✅ "The API response helper is in `api-response.ts`"

### When Discussing Features:
- ✅ "The registration workflow uses `RegistrationModal` and `/api/send-registration-email`"
- ✅ "The demo environment is implemented in `demo/page.tsx`"
- ✅ "Security utilities are centralized in `security.ts`"

---

## 🔍 Quick Search Reference

### Finding Components:
- **UI Components**: Look in `/src/components/ui/`
- **Feature Components**: Look in `/src/components/`
- **Page Components**: Look in `/src/app/`

### Finding Utilities:
- **Core Logic**: Look in `/src/lib/`
- **Configuration**: Look in `/src/config/`
- **Helper Functions**: Look in `/src/utils/`

### Finding API Logic:
- **API Routes**: Look in `/src/app/api/`
- **Database Schema**: Look in `supabase-schema.sql`
- **Environment Config**: Look in `environment.ts`

---

## 📝 Notes for Development

1. **Component Naming**: All React components use PascalCase
2. **File Extensions**: `.tsx` for React components, `.ts` for utilities
3. **Import Paths**: Use `@/` for src directory imports
4. **Database**: All tables use snake_case, components use camelCase
5. **Environment**: All config centralized in `environment.ts`

Use this directory as your reference when communicating about any part of the BoardGuru codebase.