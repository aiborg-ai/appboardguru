/**
 * Asset Upload API Route
 * Refactored to use CQRS and hexagonal architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CommandBus } from '@/application/cqrs/command-bus';
import { UploadAssetCommand } from '@/application/cqrs/commands/upload-asset.command';
import { registerAssetHandlers } from '@/application/cqrs/register-asset-handlers';
import { AssetRepositoryImpl } from '@/infrastructure/repositories/asset.repository.impl';
import { StorageServiceImpl } from '@/infrastructure/services/storage.service.impl';
import { createUserId, createOrganizationId, createVaultId } from '@/types/core';
import type { Database } from '@/types/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
 * POST /api/assets/upload
 * Upload a new asset using CQRS architecture
 */
export async function POST(request: NextRequest) {
  console.log('[Upload API] Request received');
  
  try {
    // Step 1: Authenticate user
    const auth = await authenticateUser(request);
    if (!auth) {
      console.error('[Upload API] Authentication failed');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { user, supabase } = auth;
    console.log('[Upload API] Authenticated user:', user.email);
    
    // Step 2: Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || file?.name || 'Untitled';
    const description = formData.get('description') as string;
    const category = formData.get('category') as string || 'document';
    const tags = formData.get('tags') as string;
    const organizationId = formData.get('organizationId') as string;
    const vaultId = formData.get('vaultId') as string;
    const folderPath = formData.get('folderPath') as string || '/';
    
    // Step 3: Validate file
    if (!file) {
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        success: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    
    console.log('[Upload API] Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Step 4: Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);
    
    // Step 5: Parse tags
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Step 6: Create and execute upload command
    const commandBus = initializeCommandBus(supabase);
    
    const command = new UploadAssetCommand({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      fileContent,
      title,
      description,
      tags: parsedTags,
      category,
      folderPath,
      userId: createUserId(user.id),
      organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
      vaultId: vaultId ? createVaultId(vaultId) : undefined,
      generateThumbnail: true,
      processDocument: false
    });
    
    console.log('[Upload API] Executing upload command');
    
    const result = await commandBus.executeCommand(command);
    
    // Step 7: Handle result
    if (!result.success) {
      console.error('[Upload API] Upload failed:', {
        error: result.error,
        message: result.error.message,
        stack: result.error.stack,
        details: JSON.stringify(result.error)
      });
      return NextResponse.json({ 
        success: false,
        error: result.error.message,
        details: result.error.toString()
      }, { status: 500 });
    }
    
    const { asset, uploadUrl, thumbnailUrl } = result.data;
    
    console.log('[Upload API] Upload successful:', {
      assetId: asset.id,
      title: asset.title,
      uploadUrl
    });
    
    // Step 8: Return success response
    return NextResponse.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          title: asset.title,
          description: asset.description,
          fileName: asset.fileMetadata.fileName,
          fileSize: asset.fileMetadata.fileSize,
          mimeType: asset.fileMetadata.mimeType,
          category: asset.category,
          tags: asset.tags,
          folderPath: asset.folderPath,
          status: asset.status,
          visibility: asset.visibility,
          createdAt: asset.createdAt,
          uploadUrl,
          thumbnailUrl
        }
      },
      message: 'Asset uploaded successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('[Upload API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * OPTIONS /api/assets/upload
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}