# Annotation Tables Consolidation: Field Mapping Document

## Overview
This document maps fields from `document_annotations` table to `asset_annotations` table for consolidation migration.

## Table Comparison

### Common Fields (Direct Mapping)
| document_annotations | asset_annotations | Notes |
|---------------------|-------------------|-------|
| id | id | UUID primary key |
| asset_id | asset_id | References vault_assets/assets |
| user_id | created_by | User who created annotation |
| page | page_number | Page number in document |
| coordinates | position | JSONB position data |
| content | comment_text | Text content of annotation |
| reference_text | selected_text | Selected/referenced text |
| created_at | created_at | Creation timestamp |
| updated_at | updated_at | Update timestamp |

### Type Mapping
| document_annotations.type | asset_annotations.annotation_type | Notes |
|---------------------------|-----------------------------------|-------|
| 'comment' | 'textbox' | General comments |
| 'question' | 'textbox' | Questions as textbox with marker |
| 'note' | 'textbox' | Notes as textbox |
| 'voice' | 'voice' | **NEW** - Need to add to asset_annotations |

### Fields Requiring Transformation
| document_annotations | asset_annotations | Transformation Required |
|---------------------|-------------------|------------------------|
| user_name | - | Not stored, fetched via join |
| voice_url | content.audioUrl | Store in JSONB content field |
| is_shared | is_private | Inverse logic: !is_shared |
| shared_with[] | - | **Consider adding** shared_with array to asset_annotations |

### New Required Fields for asset_annotations
| Field | Source/Default | Notes |
|-------|---------------|-------|
| vault_id | NULL | Optional, can be derived from asset |
| organization_id | Lookup from asset | Required - fetch from assets table |
| annotation_type | Map from type | See type mapping above |
| content | JSONB object | Structure: {text?, audioUrl?, audioTranscription?} |
| position | Transform coordinates | Structure: {pageNumber, rects, boundingRect} |
| color | '#FFFF00' | Default yellow |
| opacity | 0.3 | Default opacity |
| is_resolved | false | Default unresolved |
| is_anchored | true | Default anchored |
| is_deleted | false | Active record |

### Fields Only in document_annotations (Features to Preserve)
- **voice_url**: Voice recording URL - add to content JSONB
- **user_name**: Cached username - consider adding for performance
- **shared_with[]**: Array of user IDs - add for granular permissions

### Fields Only in asset_annotations (Advanced Features)
- **vault_id**: Vault reference
- **organization_id**: Multi-tenant support
- **anchor_text**: Re-anchoring support
- **resolved_by/resolved_at**: Resolution tracking
- **metadata**: Flexible metadata storage

## Migration SQL Template

```sql
-- Step 1: Add voice support to asset_annotations
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

-- Step 2: Migrate data
INSERT INTO asset_annotations (
    id,
    asset_id,
    vault_id,
    organization_id,
    created_by,
    created_at,
    updated_at,
    annotation_type,
    content,
    page_number,
    position,
    selected_text,
    comment_text,
    color,
    opacity,
    is_private,
    is_resolved,
    voice_url,
    shared_with
)
SELECT 
    da.id,
    da.asset_id,
    NULL, -- vault_id to be populated separately if needed
    a.organization_id, -- from assets table
    da.user_id,
    da.created_at,
    da.updated_at,
    CASE da.type
        WHEN 'comment' THEN 'textbox'
        WHEN 'question' THEN 'textbox'
        WHEN 'note' THEN 'textbox'
        WHEN 'voice' THEN 'voice'
        ELSE 'textbox'
    END,
    jsonb_build_object(
        'text', da.content,
        'audioUrl', da.voice_url,
        'type', da.type
    ),
    da.page,
    jsonb_build_object(
        'pageNumber', da.page,
        'rects', COALESCE(da.coordinates->'rects', '[]'::jsonb),
        'boundingRect', COALESCE(
            da.coordinates->'boundingRect',
            jsonb_build_object(
                'x1', (da.coordinates->>'x')::float,
                'y1', (da.coordinates->>'y')::float,
                'x2', ((da.coordinates->>'x')::float + (da.coordinates->>'width')::float),
                'y2', ((da.coordinates->>'y')::float + (da.coordinates->>'height')::float),
                'width', (da.coordinates->>'width')::float,
                'height', (da.coordinates->>'height')::float
            )
        )
    ),
    da.reference_text,
    da.content,
    '#FFFF00', -- default color
    0.3, -- default opacity
    NOT da.is_shared, -- inverse logic
    false, -- not resolved by default
    da.voice_url,
    da.shared_with
FROM document_annotations da
JOIN assets a ON da.asset_id = a.id
WHERE NOT EXISTS (
    SELECT 1 FROM asset_annotations aa 
    WHERE aa.id = da.id
);

-- Step 3: Migrate replies
INSERT INTO annotation_replies (
    id,
    annotation_id,
    parent_reply_id,
    reply_text,
    created_by,
    created_at,
    updated_at
)
SELECT
    dar.id,
    dar.annotation_id,
    NULL, -- no parent reply tracking in old system
    dar.content,
    dar.user_id,
    dar.created_at,
    dar.updated_at
FROM document_annotation_replies dar
WHERE EXISTS (
    SELECT 1 FROM asset_annotations aa
    WHERE aa.id = dar.annotation_id
)
AND NOT EXISTS (
    SELECT 1 FROM annotation_replies ar
    WHERE ar.id = dar.id
);
```

## Backwards Compatibility View

```sql
-- Create view for backwards compatibility
CREATE OR REPLACE VIEW document_annotations_compat AS
SELECT
    aa.id,
    aa.asset_id,
    aa.created_by as user_id,
    u.name as user_name,
    CASE aa.annotation_type
        WHEN 'textbox' THEN 
            CASE 
                WHEN aa.content->>'type' = 'question' THEN 'question'
                WHEN aa.content->>'type' = 'note' THEN 'note'
                ELSE 'comment'
            END
        WHEN 'voice' THEN 'voice'
        ELSE 'comment'
    END as type,
    aa.comment_text as content,
    aa.voice_url,
    aa.page_number as page,
    jsonb_build_object(
        'x', aa.position->'boundingRect'->>'x1',
        'y', aa.position->'boundingRect'->>'y1',
        'width', aa.position->'boundingRect'->>'width',
        'height', aa.position->'boundingRect'->>'height'
    ) as coordinates,
    aa.selected_text as reference_text,
    NOT aa.is_private as is_shared,
    aa.shared_with,
    aa.created_at,
    aa.updated_at
FROM asset_annotations aa
LEFT JOIN users u ON aa.created_by = u.id
WHERE aa.is_deleted = false;
```

## Rollback Plan

```sql
-- Rollback script if needed
-- 1. Keep original document_annotations table intact during migration
-- 2. If rollback needed:
DELETE FROM asset_annotations 
WHERE id IN (
    SELECT id FROM document_annotations
);

-- 3. Remove added columns
ALTER TABLE asset_annotations 
DROP COLUMN IF EXISTS voice_url,
DROP COLUMN IF EXISTS shared_with;

-- 4. Drop compatibility view
DROP VIEW IF EXISTS document_annotations_compat;
```

## Testing Checklist

- [ ] Backup both tables before migration
- [ ] Test migration on staging database
- [ ] Verify all annotations are migrated correctly
- [ ] Test voice annotations work after migration
- [ ] Verify shared annotations permissions
- [ ] Test backwards compatibility view
- [ ] Validate API endpoints work with new structure
- [ ] Test rollback procedure
- [ ] Performance testing with migrated data
- [ ] Real-time sync verification

## Notes

1. **Voice Support**: Need to add voice_url column to asset_annotations or store in content JSONB
2. **Shared Permissions**: Consider adding shared_with array to asset_annotations for granular access
3. **Organization ID**: Required field - must fetch from assets table during migration
4. **User Names**: Not cached in asset_annotations - will need joins for display
5. **Type Preservation**: Store original type in content JSONB for backwards compatibility