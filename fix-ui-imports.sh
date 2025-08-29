#!/bin/bash

echo "Fixing UI import paths..."

# Find and replace all incorrect import paths
find /home/vik/appboardguru2/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|@/features/shared/ui/|@/components/ui/|g" {} \;

echo "Fixed all UI import paths from @/features/shared/ui/ to @/components/ui/"

# Count how many files were affected
AFFECTED_FILES=$(find /home/vik/appboardguru2/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "@/components/ui/" {} \; | wc -l)
echo "Total files with UI imports: $AFFECTED_FILES"