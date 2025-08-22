'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { Label } from '@/features/shared/ui/label';
import { 
  FileText, 
  Search, 
  Upload,
  Check,
  Filter,
  Calendar,
  User,
  HardDrive,
  X,
  File,
  Image,
  Video,
  FileSpreadsheet,
  Presentation
} from 'lucide-react';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import { VaultWizardData } from '../CreateVaultWizard';
import { FileUploadDropzone } from '@/features/assets/FileUploadDropzone';
import { FileUploadItem } from '@/types/upload';

interface Asset {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  upload_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    page_count?: number;
    content_type?: string;
    classification?: string;
  };
  owner: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  vault?: {
    id: string;
    name: string;
  };
}

interface AssetsStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

const FILE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'pdf': FileText,
  'doc': FileText,
  'docx': FileText,
  'txt': FileText,
  'xls': FileSpreadsheet,
  'xlsx': FileSpreadsheet,
  'csv': FileSpreadsheet,
  'ppt': Presentation,
  'pptx': Presentation,
  'jpg': Image,
  'jpeg': Image,
  'png': Image,
  'gif': Image,
  'mp4': Video,
  'avi': Video,
  'mov': Video,
  'default': File,
};

const FILE_TYPE_COLORS: Record<string, string> = {
  'pdf': 'bg-red-100 text-red-600',
  'doc': 'bg-blue-100 text-blue-600',
  'docx': 'bg-blue-100 text-blue-600',
  'txt': 'bg-gray-100 text-gray-600',
  'xls': 'bg-green-100 text-green-600',
  'xlsx': 'bg-green-100 text-green-600',
  'csv': 'bg-green-100 text-green-600',
  'ppt': 'bg-orange-100 text-orange-600',
  'pptx': 'bg-orange-100 text-orange-600',
  'jpg': 'bg-purple-100 text-purple-600',
  'jpeg': 'bg-purple-100 text-purple-600',
  'png': 'bg-purple-100 text-purple-600',
  'gif': 'bg-purple-100 text-purple-600',
  'mp4': 'bg-indigo-100 text-indigo-600',
  'avi': 'bg-indigo-100 text-indigo-600',
  'mov': 'bg-indigo-100 text-indigo-600',
  'default': 'bg-gray-100 text-gray-600',
};

export default function AssetsStep({ data, onUpdate }: AssetsStepProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load user's assets
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/assets');
      if (response.ok) {
        const result = await response.json();
        setAssets(result.assets || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter assets based on search and filter
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'mine' && asset.owner.id === 'current-user-id') ||
      (selectedFilter === 'shared' && asset.vault !== null);
    return matchesSearch && matchesFilter && asset.upload_status === 'completed';
  });

  // Handle asset selection
  const handleAssetSelect = useCallback((asset: Asset, selected: boolean) => {
    const currentSelected = data.selectedAssets;
    const newSelected = selected
      ? [...currentSelected, {
          id: asset.id,
          name: asset.name,
          file_type: asset.file_type,
          file_size: asset.file_size,
          created_at: asset.created_at,
        }]
      : currentSelected.filter(a => a.id !== asset.id);
    
    onUpdate({ selectedAssets: newSelected });
  }, [data.selectedAssets, onUpdate]);

  // Handle select all in filtered results
  const handleSelectAll = useCallback((selectAll: boolean) => {
    if (selectAll) {
      const allFilteredAssets = filteredAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        file_type: asset.file_type,
        file_size: asset.file_size,
        created_at: asset.created_at,
      }));
      onUpdate({ selectedAssets: allFilteredAssets });
    } else {
      onUpdate({ selectedAssets: [] });
    }
  }, [filteredAssets, onUpdate]);

  const isAssetSelected = useCallback((assetId: string) => {
    return data.selectedAssets.some(a => a.id === assetId);
  }, [data.selectedAssets]);

  const getFileIcon = (fileType: string) => {
    const IconComponent = FILE_TYPE_ICONS[fileType.toLowerCase()] || FILE_TYPE_ICONS.default || File;
    return IconComponent;
  };

  const getFileTypeColor = (fileType: string) => {
    return FILE_TYPE_COLORS[fileType.toLowerCase()] || FILE_TYPE_COLORS.default;
  };

  // Handle upload completion
  const handleUploadComplete = useCallback((uploadedFiles: FileUploadItem[]) => {
    // Convert uploaded files to the Asset format expected by the wizard
    const newAssets = uploadedFiles.map(file => ({
      id: file.id,
      name: file.title,
      file_type: file.file.type.split('/')[1] || 'unknown',
      file_size: file.file.size,
      created_at: new Date().toISOString(),
    }));

    // Add to selected assets
    onUpdate({ 
      selectedAssets: [...data.selectedAssets, ...newAssets]
    });

    // Close modal and refresh assets list
    setShowUploadModal(false);
    loadAssets();
  }, [data.selectedAssets, onUpdate]);

  const selectedCount = data.selectedAssets.length;
  const allFilteredSelected = filteredAssets.length > 0 && 
    filteredAssets.every(asset => isAssetSelected(asset.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Include Assets
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Select documents and files to include in your vault
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Assets</option>
              <option value="mine">My Assets</option>
              <option value="shared">Shared with Me</option>
            </select>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          variant="outline"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New</span>
        </Button>
      </div>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">
              {selectedCount} asset{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ selectedAssets: [] })}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear all
          </Button>
        </motion.div>
      )}

      {/* Select All Checkbox */}
      {filteredAssets.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="select-all"
              checked={allFilteredSelected}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="text-sm font-medium">
              Select all {filteredAssets.length} assets
            </Label>
          </div>
          <div className="text-sm text-gray-500">
            {selectedCount} of {assets.length} assets selected
          </div>
        </div>
      )}

      {/* Assets List */}
      <AnimatePresence>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssets.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAssets.map((asset) => {
              const FileIconComponent = getFileIcon(asset.file_type);
              const selected = isAssetSelected(asset.id);
              
              return (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md relative",
                      selected && "ring-2 ring-blue-500 bg-blue-50"
                    )}
                    onClick={() => handleAssetSelect(asset, !selected)}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 right-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => handleAssetSelect(asset, !!checked)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>

                    <CardContent className="p-4 pr-12">
                      {/* File Icon and Type */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          getFileTypeColor(asset.file_type)
                        )}>
                          {FileIconComponent && <FileIconComponent className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {asset.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs uppercase">
                              {asset.file_type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatBytes(asset.file_size)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      {asset.metadata && (
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                          {asset.metadata.page_count && (
                            <span>{asset.metadata.page_count} pages</span>
                          )}
                          {asset.metadata.classification && (
                            <Badge variant="outline" className="text-xs">
                              {asset.metadata.classification}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Owner and Date */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <User className="w-3 h-3" />
                          <span className="truncate">{asset.owner.full_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(asset.created_at)}</span>
                        </div>
                      </div>

                      {/* Vault info if shared */}
                      {asset.vault && (
                        <div className="mt-2 text-xs text-blue-600">
                          From vault: {asset.vault.name}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">
              {searchTerm ? 'No assets found' : 'No assets yet'}
            </h4>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? `No assets match "${searchTerm}"`
                : 'Upload your first document to get started'
              }
            </p>
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Asset</span>
            </Button>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Assets Preview */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-gray-50 rounded-lg"
        >
          <h4 className="font-medium text-gray-900 mb-4">
            Selected Assets ({selectedCount})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.selectedAssets.map((asset) => {
              const FileIconComponent = getFileIcon(asset.file_type);
              return (
                <div 
                  key={asset.id}
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border"
                >
                  <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center",
                    getFileTypeColor(asset.file_type)
                  )}>
                    {FileIconComponent && <FileIconComponent className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(asset.file_size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAssetSelect(asset as Asset, false)}
                    className="p-1 h-auto text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Total size: {formatBytes(
                  data.selectedAssets.reduce((sum, asset) => sum + asset.file_size, 0)
                )}
              </span>
              <span className="text-blue-600 font-medium">
                {selectedCount} asset{selectedCount !== 1 ? 's' : ''} ready for vault
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Upload Assets to Vault
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Upload documents and files to include in your new vault
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <FileUploadDropzone 
                onUploadComplete={handleUploadComplete}
                organizationId="vault-creation" // Placeholder for vault creation context
                currentUser={{
                  id: 'vault-creator',
                  name: 'Vault Creator',
                  email: 'creator@example.com'
                }}
                showCollaborationHub={false}
                className="min-h-[300px]"
              />
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
    </div>
  );
}