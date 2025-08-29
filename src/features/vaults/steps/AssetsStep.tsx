'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { 
  FileText, 
  Search, 
  Loader2, 
  File,
  Image,
  FileSpreadsheet,
  FileCode,
  Filter,
  Upload
} from 'lucide-react';
import { VaultWizardData } from '../CreateVaultWizard';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

interface AssetsStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

export default function AssetsStep({ data, onUpdate }: AssetsStepProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: userAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (userAssets) {
        setAssets(userAssets);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-5 w-5 text-gray-400" />;
    
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-green-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) 
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (fileType.includes('code') || fileType.includes('json')) 
      return <FileCode className="h-5 w-5 text-blue-500" />;
    
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleSelectAsset = (asset: any) => {
    const isSelected = data.selectedAssets.some(a => a.id === asset.id);
    
    if (isSelected) {
      onUpdate({
        selectedAssets: data.selectedAssets.filter(a => a.id !== asset.id)
      });
    } else {
      onUpdate({
        selectedAssets: [...data.selectedAssets, asset]
      });
    }
  };

  const handleSelectAll = () => {
    if (data.selectedAssets.length === filteredAssets.length) {
      onUpdate({ selectedAssets: [] });
    } else {
      onUpdate({ selectedAssets: filteredAssets });
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.original_file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || 
                       (asset.mime_type && asset.mime_type.includes(filterType));
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Include Assets
        </h3>
        <p className="text-sm text-gray-600">
          Select documents and files to include in your vault
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterType(filterType === 'all' ? 'pdf' : 'all')}
        >
          <Filter className="h-4 w-4 mr-2" />
          {filterType === 'all' ? 'All Types' : 'PDFs Only'}
        </Button>
      </div>

      {filteredAssets.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {data.selectedAssets.length === filteredAssets.length ? 'Deselect All' : 'Select All'}
          </Button>
          <p className="text-sm text-gray-600">
            {data.selectedAssets.length} of {filteredAssets.length} selected
          </p>
        </div>
      )}

      {filteredAssets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No Assets Found
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              You haven't uploaded any assets yet. Upload some files first or skip this step.
            </p>
            <Button variant="outline">
              Upload Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredAssets.map((asset) => {
            const isSelected = data.selectedAssets.some(a => a.id === asset.id);
            
            return (
              <Card
                key={asset.id}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected && "ring-2 ring-blue-500 bg-blue-50"
                )}
                onClick={() => handleSelectAsset(asset)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectAsset(asset)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(asset.mime_type)}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                              {asset.file_name || asset.original_file_name || 'Untitled'}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {formatFileSize(asset.file_size)} • {new Date(asset.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      {asset.tags && asset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {asset.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {data.selectedAssets.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            Selected Assets ({data.selectedAssets.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {data.selectedAssets.map(asset => (
              <Badge key={asset.id} variant="outline" className="text-xs">
                {asset.file_name || asset.original_file_name || 'Untitled'}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}