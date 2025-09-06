/**
 * Asset Detail API Route
 * Refactored to use CQRS and hexagonal architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CommandBus } from '@/application/cqrs/command-bus';
import { GetAssetQuery } from '@/application/cqrs/queries/get-asset.query';
import { UpdateAssetCommand } from '@/application/cqrs/commands/update-asset.command';
import { DeleteAssetCommand } from '@/application/cqrs/commands/delete-asset.command';
import { registerAssetHandlers } from '@/application/cqrs/register-asset-handlers';
import { AssetRepositoryImpl } from '@/infrastructure/repositories/asset.repository.impl';
import { StorageServiceImpl } from '@/infrastructure/services/storage.service.impl';
import { createUserId, createAssetId } from '@/types/core';
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
      console.log('[Asset API] Authenticated via Bearer token:', authData.user.email);
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
    console.log('[Asset API] Authenticated via cookies:', user.email);
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
 * GET /api/assets/[id]
 * Get a single asset using CQRS query
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id;
    
    if (!assetId) {
      return NextResponse.json({ 
        success: false,
        error: 'Asset ID is required' 
      }, { status: 400 });
    }
    
    // Authenticate user
    const auth = await authenticateUser(request);
    if (!auth) {
      console.error('[Asset API] No authenticated user');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { user, supabase } = auth;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    
    // Initialize command bus
    const commandBus = initializeCommandBus(supabase);
    
    // Create and execute query
    const query = new GetAssetQuery({
      assetId: createAssetId(assetId),
      userId: createUserId(user.id),
      includeDeleted
    });
    
    console.log('[Asset API] Executing get query:', {
      assetId,
      userId: user.id,
      userEmail: user.email,
      includeDeleted
    });
    
    const result = await commandBus.executeQuery(query);
    
    if (!result.success) {
      console.error('[Asset API] Query failed:', result.error);
      
      // Return 404 if asset not found
      if (result.error.message === 'Asset not found' || 
          result.error.message.includes('not have permission')) {
        return NextResponse.json({
          success: false,
          error: result.error.message
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: result.error.message
      }, { status: 500 });
    }
    
    const asset = result.data;
    
    // Get storage URL if file path exists
    let fileUrl: string | undefined;
    if (asset.fileMetadata.filePath) {
      // Generate a signed URL for secure file access
      const storageResult = await supabase.storage
        .from(asset.fileMetadata.storageBucket || 'assets')
        .createSignedUrl(asset.fileMetadata.filePath, 3600); // 1 hour expiry
      
      if (storageResult.data) {
        fileUrl = storageResult.data.signedUrl;
      }
    }
    
    // Transform asset for frontend
    const transformedAsset = {
      id: asset.id,
      title: asset.title || asset.fileMetadata.fileName || 'Untitled',
      description: asset.description,
      fileName: asset.fileMetadata.fileName,
      file_name: asset.fileMetadata.fileName,
      fileType: asset.fileMetadata.fileType,
      file_type: asset.fileMetadata.fileType,
      fileSize: asset.fileMetadata.fileSize,
      file_size: asset.fileMetadata.fileSize,
      mimeType: asset.fileMetadata.mimeType,
      mime_type: asset.fileMetadata.mimeType,
      filePath: asset.fileMetadata.filePath,
      file_path: fileUrl || asset.fileMetadata.filePath,
      category: asset.category || 'general',
      folder: asset.folderPath || '/',
      folderPath: asset.folderPath,
      folder_path: asset.folderPath,
      tags: asset.tags || [],
      thumbnail: asset.fileMetadata.thumbnailUrl,
      thumbnailUrl: asset.fileMetadata.thumbnailUrl,
      thumbnail_url: asset.fileMetadata.thumbnailUrl,
      createdAt: asset.createdAt,
      created_at: asset.createdAt,
      updatedAt: asset.updatedAt,
      updated_at: asset.updatedAt,
      isOwner: asset.ownerId === user.id,
      owner: {
        id: asset.ownerId,
        name: user.email?.split('@')[0] || 'Unknown',
        email: user.email
      },
      owner_id: asset.ownerId,
      uploadedBy: asset.uploadedBy,
      uploaded_by: asset.uploadedBy,
      organizationId: asset.organizationId,
      organization_id: asset.organizationId,
      vaultId: asset.vaultId,
      vault_id: asset.vaultId,
      status: asset.status,
      visibility: asset.visibility,
      viewCount: asset.viewCount,
      view_count: asset.viewCount,
      downloadCount: asset.downloadCount,
      download_count: asset.downloadCount,
      isDeleted: asset.isDeleted,
      is_deleted: asset.isDeleted
    };
    
    console.log('[Asset API] Query successful:', {
      assetId: asset.id,
      title: asset.title,
      status: asset.status
    });
    
    return NextResponse.json({
      success: true,
      asset: transformedAsset
    });
    
  } catch (error) {
    console.error('[Asset API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/assets/[id]
 * Update an asset using UpdateAssetCommand
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id;
    
    if (!assetId) {
      return NextResponse.json({ 
        success: false,
        error: 'Asset ID is required' 
      }, { status: 400 });
    }
    
    // Authenticate user
    const auth = await authenticateUser(request);
    if (!auth) {
      console.error('[Asset API] No authenticated user');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { user, supabase } = auth;
    
    // Parse request body
    const body = await request.json();
    
    // Initialize command bus
    const commandBus = initializeCommandBus(supabase);
    
    // Create and execute update command
    const command = new UpdateAssetCommand({
      assetId: createAssetId(assetId),
      updatedBy: createUserId(user.id),
      updates: {
        title: body.title,
        description: body.description,
        tags: body.tags,
        category: body.category,
        folderPath: body.folderPath || body.folder_path,
        visibility: body.visibility
      }
    });
    
    console.log('[Asset API] Executing update command:', {
      assetId,
      userId: user.id,
      updateFields: Object.keys(command.payload.updates).filter(k => command.payload.updates[k as keyof typeof command.payload.updates] !== undefined)
    });
    
    const result = await commandBus.executeCommand(command);
    
    if (!result.success) {
      console.error('[Asset API] Update failed:', result.error);
      
      // Return 403 for permission errors
      if (result.error.message.includes('permission')) {
        return NextResponse.json({
          success: false,
          error: result.error.message
        }, { status: 403 });
      }
      
      // Return 404 for not found
      if (result.error.message === 'Asset not found') {
        return NextResponse.json({
          success: false,
          error: result.error.message
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: result.error.message
      }, { status: 500 });
    }
    
    const updatedAsset = result.data;
    
    // Transform asset for frontend
    const transformedAsset = {
      id: updatedAsset.id,
      title: updatedAsset.title || updatedAsset.fileMetadata.fileName || 'Untitled',
      description: updatedAsset.description,
      fileName: updatedAsset.fileMetadata.fileName,
      file_name: updatedAsset.fileMetadata.fileName,
      fileType: updatedAsset.fileMetadata.fileType,
      file_type: updatedAsset.fileMetadata.fileType,
      fileSize: updatedAsset.fileMetadata.fileSize,
      file_size: updatedAsset.fileMetadata.fileSize,
      category: updatedAsset.category || 'general',
      folderPath: updatedAsset.folderPath,
      folder_path: updatedAsset.folderPath,
      tags: updatedAsset.tags || [],
      visibility: updatedAsset.visibility,
      updatedAt: updatedAsset.updatedAt,
      updated_at: updatedAsset.updatedAt
    };
    
    console.log('[Asset API] Update successful:', {
      assetId: updatedAsset.id,
      title: updatedAsset.title
    });
    
    return NextResponse.json({
      success: true,
      asset: transformedAsset
    });
    
  } catch (error) {
    console.error('[Asset API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/assets/[id]
 * Delete an asset using DeleteAssetCommand
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id;
    
    if (!assetId) {
      return NextResponse.json({ 
        success: false,
        error: 'Asset ID is required' 
      }, { status: 400 });
    }
    
    // Authenticate user
    const auth = await authenticateUser(request);
    if (!auth) {
      console.error('[Asset API] No authenticated user');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { user, supabase } = auth;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const reason = searchParams.get('reason');
    
    // Initialize command bus
    const commandBus = initializeCommandBus(supabase);
    
    // Create and execute delete command
    const command = new DeleteAssetCommand({
      assetId: createAssetId(assetId),
      userId: createUserId(user.id),
      permanent,
      reason: reason || undefined
    });
    
    console.log('[Asset API] Executing delete command:', {
      assetId,
      userId: user.id,
      permanent,
      reason
    });
    
    const result = await commandBus.executeCommand(command);
    
    if (!result.success) {
      console.error('[Asset API] Delete failed:', result.error);
      
      // Return 403 for permission errors
      if (result.error.message.includes('permission')) {
        return NextResponse.json({
          success: false,
          error: result.error.message
        }, { status: 403 });
      }
      
      // Return 404 for not found
      if (result.error.message === 'Asset not found') {
        return NextResponse.json({
          success: false,
          error: result.error.message
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: result.error.message
      }, { status: 500 });
    }
    
    console.log('[Asset API] Delete successful:', {
      assetId,
      permanent
    });
    
    return NextResponse.json({
      success: true,
      message: permanent ? 'Asset permanently deleted' : 'Asset moved to trash'
    });
    
  } catch (error) {
    console.error('[Asset API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error'
    }, { status: 500 });
  }
}