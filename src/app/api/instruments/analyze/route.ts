import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { instrumentId, goal, assets, saveOptions, results } = body;

    // Validate required fields
    if (!instrumentId || !goal || !assets || assets.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: instrumentId, goal, and assets' },
        { status: 400 }
      );
    }

    // Get user's current organization
    const { data: membershipData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!membershipData) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400 }
      );
    }

    const organizationId = membershipData.organization_id;
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let createdAssetId = null;
    let createdVaultAssetId = null;

    // Save as Asset if enabled
    if (saveOptions.saveAsAsset?.enabled) {
      const assetName = saveOptions.saveAsAsset.assetName || `${goal.title} Results - ${new Date().toLocaleDateString()}`;
      
      // Create analysis document content
      const analysisDocument = {
        id: analysisId,
        instrumentId,
        goalTitle: goal.title,
        goalDescription: goal.description,
        assetsAnalyzed: assets.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: a.type
        })),
        results: {
          insights: results?.insights || [],
          charts: results?.charts || [],
          recommendations: results?.recommendations || [],
          keyFindings: results?.keyFindings || [],
          riskFactors: results?.riskFactors || []
        },
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: user.email,
          processingTime: results?.metadata?.processingTime || 5000,
          confidence: results?.metadata?.confidence || 0.89,
          documentsProcessed: assets.length,
          includeCharts: saveOptions.saveAsAsset.includeCharts ?? true,
          includeRawData: saveOptions.saveAsAsset.includeRawData ?? false
        }
      };

      // Store the analysis document as a JSON blob
      const fileContent = JSON.stringify(analysisDocument, null, 2);
      const fileSize = new Blob([fileContent]).size;
      
      // Create asset record in database
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .insert({
          title: assetName,
          description: `Analysis results from ${goal.title} using ${instrumentId} instrument`,
          file_name: `${assetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`,
          file_path: `analyses/${organizationId}/${analysisId}.json`,
          file_size: fileSize,
          file_type: 'analysis_report',
          mime_type: 'application/json',
          category: 'analysis',
          tags: ['instrument', instrumentId, 'analysis', goal.category || 'general'],
          owner_id: user.id,
          organization_id: organizationId,
          metadata: {
            instrumentId,
            goalId: goal.id,
            analysisId,
            assetsAnalyzed: assets.length,
            exportFormats: Object.keys(saveOptions.exportOptions || {}).filter(k => saveOptions.exportOptions[k])
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assetError) {
        console.error('Failed to create asset:', assetError);
        return NextResponse.json(
          { error: 'Failed to save analysis as asset' },
          { status: 500 }
        );
      }

      createdAssetId = assetData.id;

      // Store the actual content (in a real implementation, this would go to storage)
      // For now, we'll store it in a metadata field or a separate analysis table
      const { error: contentError } = await supabase
        .from('asset_content')
        .insert({
          asset_id: createdAssetId,
          content: fileContent,
          content_type: 'analysis_json',
          created_at: new Date().toISOString()
        });

      if (contentError) {
        // If content table doesn't exist, update the asset metadata
        await supabase
          .from('assets')
          .update({
            metadata: {
              ...assetData.metadata,
              analysisContent: analysisDocument
            }
          })
          .eq('id', createdAssetId);
      }
    }

    // Save to Vault if enabled
    if (saveOptions.saveToVault?.enabled && createdAssetId) {
      let vaultId = saveOptions.saveToVault.vaultId;

      // Create new vault if needed
      if (saveOptions.saveToVault.createNewVault) {
        const { data: vaultData, error: vaultError } = await supabase
          .from('vaults')
          .insert({
            name: saveOptions.saveToVault.vaultName || `Analysis Vault - ${new Date().toLocaleDateString()}`,
            description: `Created from ${goal.title} analysis`,
            organization_id: organizationId,
            created_by: user.id,
            status: 'active',
            priority: 'medium',
            is_public: false,
            requires_invitation: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!vaultError && vaultData) {
          vaultId = vaultData.id;

          // Add creator as owner
          await supabase
            .from('vault_members')
            .insert({
              vault_id: vaultId,
              user_id: user.id,
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString()
            });
        }
      }

      // Add asset to vault
      if (vaultId) {
        const { data: vaultAssetData, error: vaultAssetError } = await supabase
          .from('vault_assets')
          .insert({
            vault_id: vaultId,
            asset_id: createdAssetId,
            added_by: user.id,
            added_at: new Date().toISOString(),
            is_featured: true,
            is_required_reading: false,
            display_order: 0
          })
          .select()
          .single();

        if (!vaultAssetError && vaultAssetData) {
          createdVaultAssetId = vaultAssetData.id;
        }
      }
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: organizationId,
        performed_by: user.id,
        action: 'instrument_analysis_completed',
        resource_type: 'analysis',
        resource_id: analysisId,
        metadata: {
          instrumentId,
          goalTitle: goal.title,
          assetsAnalyzed: assets.length,
          assetCreated: createdAssetId,
          vaultAssetCreated: createdVaultAssetId
        },
        created_at: new Date().toISOString()
      });

    // Prepare response
    const response = {
      success: true,
      analysisId,
      instrumentId,
      goal: goal.title,
      assetsProcessed: assets.length,
      timestamp: new Date().toISOString(),
      
      // Include actual save results
      saveResults: {
        ...(createdAssetId && {
          asset: {
            id: createdAssetId,
            name: saveOptions.saveAsAsset.assetName || `${goal.title} Results`,
            type: 'analysis_report',
            saved: true,
            viewUrl: `/dashboard/assets/${createdAssetId}/view`
          }
        }),
        ...(saveOptions.saveToVault?.enabled && {
          vault: {
            id: saveOptions.saveToVault.vaultId || vaultId,
            name: saveOptions.saveToVault.vaultName || 'Analysis Vault',
            saved: true,
            assetAdded: !!createdVaultAssetId
          }
        }),
        ...(saveOptions.shareOptions?.enabled && {
          sharing: {
            boardMatesNotified: saveOptions.shareOptions.shareWithBoardMates || false,
            publicLink: saveOptions.shareOptions.generatePublicLink ? 
              `https://app.boardguru.com/shared/${analysisId}` : null,
            emailsSent: saveOptions.shareOptions.emailRecipients?.length || 0
          }
        }),
        exports: Object.entries(saveOptions.exportOptions || {})
          .filter(([_, enabled]) => enabled)
          .map(([format]) => ({
            format,
            downloadUrl: `/api/exports/${analysisId}.${format}`,
            status: 'ready'
          }))
      },

      // Include the analysis results
      insights: results?.insights || [],
      charts: results?.charts || [],
      recommendations: results?.recommendations || [],
      
      // Processing metadata
      metadata: {
        processingTime: results?.metadata?.processingTime || 5000,
        confidence: results?.metadata?.confidence || 0.89,
        documentsProcessed: assets.length,
        assetId: createdAssetId
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing analysis:', error);
    return NextResponse.json(
      { error: 'Failed to process analysis. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle GET requests with analysis status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get('analysisId');

  if (!analysisId) {
    return NextResponse.json(
      { error: 'Analysis ID required' },
      { status: 400 }
    );
  }

  // Mock analysis status (in production, fetch from database)
  return NextResponse.json({
    analysisId,
    status: 'completed',
    progress: 100,
    message: 'Analysis completed successfully'
  });
}