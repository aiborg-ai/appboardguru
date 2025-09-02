import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { AnnotationRepository } from '@/lib/repositories/annotation.repository';
import { AnnotationService } from '@/lib/services/annotation.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const pageNumber = searchParams.get('pageNumber');
    const isResolved = searchParams.get('isResolved');
    const createdBy = searchParams.get('createdBy');
    
    // Initialize repository and service
    const repository = new AnnotationRepository(supabase);
    const service = new AnnotationService(repository);
    
    // Build criteria
    const criteria: any = {};
    if (pageNumber) criteria.pageNumber = parseInt(pageNumber);
    if (isResolved !== null) criteria.isResolved = isResolved === 'true';
    if (createdBy) criteria.createdBy = createdBy;
    
    // Fetch annotations
    const result = await service.getAnnotationsByAssetId(params.assetId, criteria);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ annotations: result.data });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Get the asset to verify access and get organization ID
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, vault_id, vaults!inner(organization_id)')
      .eq('id', params.assetId)
      .single();
    
    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    
    // Check if user is member of the organization
    const organizationId = asset.vaults?.organization_id;
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    
    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Initialize repository and service
    const repository = new AnnotationRepository(supabase);
    const service = new AnnotationService(repository);
    
    // Create annotation data
    const annotationData = {
      annotationType: body.annotation_type || 'highlight',
      content: body.content || { text: body.comment_text },
      pageNumber: body.page_number,
      position: body.position,
      selectedText: body.selected_text,
      commentText: body.comment_text,
      color: body.color || '#FFFF00',
      opacity: body.opacity ?? 0.3,
      isPrivate: body.is_private || false,
      vaultId: asset.vault_id
    };
    
    // Create the annotation
    const result = await service.createAnnotation(
      annotationData,
      params.assetId,
      user.id,
      organizationId
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
    
    // Get user details for response
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    // Format the response
    const annotation = {
      ...result.data,
      user: userData || { id: user.id, full_name: 'Unknown User' }
    };
    
    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    );
  }
}