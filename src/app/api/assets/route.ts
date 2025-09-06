/**
 * Assets API Route
 * Refactored to use CQRS and hexagonal architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CommandBus } from '@/application/cqrs/command-bus';
import { ListAssetsQuery } from '@/application/cqrs/queries/get-asset.query';
import { registerAssetHandlers } from '@/application/cqrs/register-asset-handlers';
import { AssetRepositoryImpl } from '@/infrastructure/repositories/asset.repository.impl';
import { StorageServiceImpl } from '@/infrastructure/services/storage.service.impl';
import { createUserId, createOrganizationId, createVaultId } from '@/types/core';
import type { Database } from '@/types/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Helper to extract user from request
 */
async function authenticateUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Try Bearer token first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    const { data: authData, error } = await supabase.auth.getUser(token);
    if (!error && authData?.user) {
      console.log('[Assets API] Authenticated via Bearer token:', authData.user.email);
      return { user: authData.user, supabase };
    }
  }
  
  // Fallback to cookies
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookie = allCookies.find(c => c.name === name);
        return cookie?.value;
      },
      set() {},
      remove() {}
    }
  });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) {
    console.log('[Assets API] Authenticated via cookies:', user.email);
    return { user, supabase };
  }
  
  return null;
}

/**
 * Initialize command bus with dependencies
 */
function initializeCommandBus(supabase: any) {
  const commandBus = CommandBus.getInstance();
  
  // Create dependencies
  const assetRepository = new AssetRepositoryImpl(supabase);
  const storageService = new StorageServiceImpl(supabase);
  
  // Register handlers
  registerAssetHandlers(commandBus, {
    assetRepository,
    storageService
  });
  
  return commandBus;
}

/**
 * GET /api/assets
 * List assets using CQRS query
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request);
    if (!auth) {
      console.error('[Assets API] No authenticated user');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { user, supabase } = auth;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const organizationId = searchParams.get('organizationId');
    const vaultId = searchParams.get('vaultId');
    const includeShared = searchParams.get('includeShared') === 'true';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    
    // Parse tags if provided
    let tags: string[] | undefined;
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      try {
        tags = JSON.parse(tagsParam);
      } catch {
        tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Initialize command bus
    const commandBus = initializeCommandBus(supabase);
    
    // Create and execute query
    const query = new ListAssetsQuery({
      userId: createUserId(user.id),
      filters: {
        organizationId: organizationId || undefined,
        vaultId: vaultId || undefined,
        category: category && category !== 'all' ? category : undefined,
        tags,
        searchTerm: search || undefined,
        folderPath: folder && folder !== 'all' ? folder : undefined,
      },
      pagination: {
        page,
        limit,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc'
      },
      includeShared,
      includeDeleted
    });
    
    console.log('[Assets API] Executing list query:', {
      userId: user.id,
      userEmail: user.email,
      filters: query.payload.filters,
      pagination: query.payload.pagination
    });
    
    const result = await commandBus.executeQuery(query);
    
    if (!result.success) {
      console.error('[Assets API] Query failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error.message,
        assets: [],
        totalCount: 0,
        page,
        limit,
        totalPages: 0
      }, { status: 500 });
    }
    
    const { assets, total, totalPages } = result.data;
    
    // Transform assets for frontend
    const transformedAssets = assets.map(asset => ({
      id: asset.id,
      title: asset.title || asset.fileMetadata.fileName || 'Untitled',
      fileName: asset.fileMetadata.fileName,
      file_name: asset.fileMetadata.fileName,
      fileType: asset.fileMetadata.fileType,
      file_type: asset.fileMetadata.fileType,
      fileSize: asset.fileMetadata.fileSize,
      file_size: asset.fileMetadata.fileSize,
      mimeType: asset.fileMetadata.mimeType,
      mime_type: asset.fileMetadata.mimeType,
      category: asset.category || 'general',
      folder: asset.folderPath || '/',
      tags: asset.tags || [],
      thumbnail: asset.fileMetadata.thumbnailUrl,
      thumbnailUrl: asset.fileMetadata.thumbnailUrl,
      thumbnail_url: asset.fileMetadata.thumbnailUrl,
      createdAt: asset.createdAt,
      created_at: asset.createdAt,
      updatedAt: asset.updatedAt,
      updated_at: asset.updatedAt,
      isOwner: asset.ownerId === user.id,
      owner_id: asset.ownerId,
      organization_id: asset.organizationId,
      vault_id: asset.vaultId,
      status: asset.status,
      visibility: asset.visibility,
      viewCount: asset.viewCount,
      view_count: asset.viewCount,
      downloadCount: asset.downloadCount,
      download_count: asset.downloadCount,
      description: asset.description
    }));
    
    console.log('[Assets API] Query successful:', {
      assetCount: transformedAssets.length,
      total,
      page,
      totalPages
    });
    
    return NextResponse.json({
      success: true,
      assets: transformedAssets,
      totalCount: total,
      page,
      limit,
      totalPages
    });
    
  } catch (error) {
    console.error('[Assets API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      assets: [],
      totalCount: 0
    }, { status: 500 });
  }
}