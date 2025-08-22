#!/bin/bash

# Core Services & Repository TypeScript Error Fix Script
# This script systematically fixes import paths and type casts in core services

echo "🔧 Fixing Core Services & Repository TypeScript Errors..."

# Fix import paths in all service files
echo "📦 Fixing import paths in services..."

# Fix @/lib imports in services
find src/lib/services -name "*.ts" -exec sed -i "s|from '@/lib/|from '../|g" {} \;
find src/lib/services -name "*.ts" -exec sed -i "s|from '@/types/database'|from '../../types/database'|g" {} \;
find src/lib/services -name "*.ts" -exec sed -i "s|from '@/types'|from '../../types'|g" {} \;

# Fix remaining repository import paths
find src/lib/repositories -name "*.ts" -exec sed -i "s|from '@/types/database'|from '../../types/database'|g" {} \;

echo "🧹 Removing 'as any' casts in repositories..."

# Remove (this.supabase as any) patterns
find src/lib/repositories -name "*.ts" -exec sed -i "s|(this\.supabase as any)|this.supabase|g" {} \;

# Remove (data as any) patterns
find src/lib/repositories -name "*.ts" -exec sed -i "s|(data as any)|data|g" {} \;

# Remove } as any) patterns
find src/lib/repositories -name "*.ts" -exec sed -i "s|} as any)|});|g" {} \;

# Remove .insert(data as any) patterns
find src/lib/repositories -name "*.ts" -exec sed -i "s|\.insert(\([^)]*\) as any)|.insert(\1)|g" {} \;

echo "🔧 Fixing specific typing issues..."

# Fix role types in organization repository
sed -i "s|role: string = 'member'|role: Database['public']['Enums']['organization_role'] = 'member'|g" src/lib/repositories/organization.repository.ts
sed -i "s|role: string): Promise|role: Database['public']['Enums']['organization_role']): Promise|g" src/lib/repositories/organization.repository.ts

# Fix status types in asset repository
sed -i "s|status: 'processing' | 'ready' | 'failed'|status: Database['public']['Enums']['pack_status']|g" src/lib/repositories/asset.repository.ts
sed -i "s|status?: string|status?: Database['public']['Enums']['pack_status']|g" src/lib/repositories/asset.repository.ts

echo "🧹 Removing 'as any' casts in services..."

# Remove common as any patterns in services
find src/lib/services -name "*.ts" -exec sed -i "s|(supabase as any)|supabase|g" {} \;
find src/lib/services -name "*.ts" -exec sed -i "s|(this\.supabase as any)|this.supabase|g" {} \;

# Fix specific service typing issues
echo "🔧 Fixing service-specific issues..."

# Fix search service
sed -i "s|private supabase: any|private supabase: SupabaseClient|g" src/lib/services/search.service.ts

# Fix compliance engine JSON parsing
sed -i "s|JSON\.parse((.*) as any)|JSON.parse(\1 || 'null')|g" src/lib/services/compliance-engine.ts

# Fix external intelligence service
sed -i "s|await createSupabaseServerClient() as any|await createSupabaseServerClient()|g" src/lib/services/external-intelligence.ts

echo "🧪 Running TypeScript compilation check..."

# Check if compilation works
if npx tsc --noEmit --skipLibCheck; then
    echo "✅ TypeScript compilation successful!"
else
    echo "❌ Some TypeScript errors remain. Check output above."
fi

echo "📊 Checking for remaining 'as any' casts..."
remaining_casts=$(grep -r "as any" src/lib/repositories src/lib/services | wc -l)
echo "Found $remaining_casts remaining 'as any' casts"

if [ $remaining_casts -gt 0 ]; then
    echo "🔍 Remaining 'as any' locations:"
    grep -r "as any" src/lib/repositories src/lib/services | head -10
fi

echo "🎉 Core Services & Repository TypeScript fix script completed!"