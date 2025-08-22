#!/bin/bash

# Phase 2: Handle more specific any type patterns

echo "Phase 2: Fixing remaining specific any type patterns..."

# Pattern 1: Fix remaining specific function parameter types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/validator: (data: any) =>/validator: (data: unknown) =>/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/callback: (error: any/callback: (error: unknown/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/handler: (event: any) =>/handler: (event: unknown) =>/g'

# Pattern 2: Fix middleware and hook parameter types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/middleware: any)/middleware: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/context: any)/context: Record<string, unknown>)/g'

# Pattern 3: Fix common state and props types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/state: any)/state: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/props: any)/props: Record<string, unknown>)/g'

# Pattern 4: Fix array and object destructuring
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/const \[.*\]: any\[\]/const [...]: unknown[]/g'

# Pattern 5: Fix return types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/): any {/): unknown {/g'

# Pattern 6: Fix specific database and API related types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/response: any)/response: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/query: any)/query: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/result: any)/result: unknown)/g'

# Pattern 7: Fix more specific type casts
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(vault as any)\.id/vault.id/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(user as any)/user/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(admin.users as any)/admin.users/g'

# Count remaining
remaining=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -o ":\s*any\b" | wc -l)
echo "Remaining any types after phase 2: $remaining"