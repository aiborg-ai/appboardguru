#!/bin/bash

# Comprehensive any type replacement script
# This script systematically replaces common any type patterns

echo "Starting comprehensive any type replacement..."

# Common patterns to replace
# Pattern 1: (supabase as any) -> supabase
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(supabase as any)/supabase/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(this\.supabase as any)/this.supabase/g'

# Pattern 2: error: any -> error: unknown in catch blocks
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/} catch (error: any) {/} catch (error: unknown) {/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/catch (error: any) {/catch (error: unknown) {/g'

# Pattern 3: (data as any) -> data (when safe)
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(data as any)/data/g'

# Pattern 4: : any in function parameters for common cases
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/config: any)/config: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/options: any)/options: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/params: any)/params: Record<string, unknown>)/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/metadata: any)/metadata: Record<string, unknown>)/g'

# Pattern 5: Array<any> -> Array<unknown>
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/Array<any>/Array<unknown>/g'

# Pattern 6: Record<string, any> -> Record<string, unknown>
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/Record<string, any>/Record<string, unknown>/g'

# Pattern 7: Handler function parameters
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(data: any) =>/data: unknown) =>/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(item: any) =>/item: unknown) =>/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/(value: any) =>/value: unknown) =>/g'

echo "Basic patterns replaced. Checking remaining count..."

remaining=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -o ":\s*any\b" | wc -l)
echo "Remaining any types: $remaining"

echo "Replacement complete!"