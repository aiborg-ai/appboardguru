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
  X,
  File,
  Image,
  Video,
  FileSpreadsheet,
  Presentation,
  Plus,
  AlertCircle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import { InstrumentPlayWizardData } from '../InstrumentPlayWizard';

interface Asset {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  status: 'processing' | 'ready' | 'failed';
  summary?: string;
  uploaded_by: string;
  organization_id: string;
}

interface InstrumentAssetsStepProps {
  data: InstrumentPlayWizardData;
  onUpdate: (updates: Partial<InstrumentPlayWizardData>) => void;
}

const FILE_TYPE_ICONS = {
  'application/pdf': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': Presentation,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'image/png': Image,
  'image/jpeg': Image,
  'video/mp4': Video,
  'default': File,
};

const FILE_TYPE_FILTERS = [
  { label: 'All Files', value: 'all' },
  { label: 'Documents', value: 'documents', types: ['pdf', 'docx', 'doc'] },
  { label: 'Spreadsheets', value: 'spreadsheets', types: ['xlsx', 'xls'] },
  { label: 'Presentations', value: 'presentations', types: ['pptx', 'ppt'] },
  { label: 'Images', value: 'images', types: ['png', 'jpg', 'jpeg'] },
];

export default function InstrumentAssetsStep({ data, onUpdate }: InstrumentAssetsStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedGoal = data.selectedGoal;
  const instrumentConfig = data.instrumentConfig;
  
  // Get goal-specific requirements
  const goalConfig = instrumentConfig.goals.find(g => g.id === selectedGoal?.id);
  const minimumAssets = goalConfig?.minimumAssets || instrumentConfig.assetFilters?.minFiles || 1;
  const maximumAssets = instrumentConfig.assetFilters?.maxFiles;
  const supportedTypes = goalConfig?.requiredAssetTypes || instrumentConfig.assetFilters?.supportedTypes;

  // Load assets from the organization
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // In a real implementation, this would fetch from your organization's assets
        const response = await fetch('/api/assets');
        
        if (!response.ok) {
          throw new Error('Failed to load assets');
        }
        
        const result = await response.json();
        let loadedAssets = result.data || [];
        
        // Filter by supported types if specified
        if (supportedTypes && supportedTypes.length > 0) {
          loadedAssets = loadedAssets.filter((asset: Asset) => {
            const fileExtension = asset.file_name.split('.').pop()?.toLowerCase();
            return supportedTypes.includes(fileExtension || '');
          });
        }
        
        setAssets(loadedAssets);
      } catch (err) {
        console.error('Error loading assets:', err);
        setError('Failed to load assets. Please try again.');
        setAssets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [supportedTypes]);

  // Filter assets based on search and type filter
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    
    const filter = FILE_TYPE_FILTERS.find(f => f.value === selectedFilter);
    if (!filter?.types) return matchesSearch;
    
    const fileExtension = asset.file_name.split('.').pop()?.toLowerCase();
    return matchesSearch && filter.types.includes(fileExtension || '');
  });

  // Handle asset selection
  const handleAssetToggle = useCallback((asset: Asset) => {
    const isSelected = data.selectedAssets.some(a => a.id === asset.id);
    let newSelectedAssets;
    
    if (isSelected) {
      newSelectedAssets = data.selectedAssets.filter(a => a.id !== asset.id);
    } else {
      // Check maximum limit
      if (maximumAssets && data.selectedAssets.length >= maximumAssets) {
        return; // Don't add if at maximum
      }
      
      newSelectedAssets = [...data.selectedAssets, {
        id: asset.id,
        name: asset.title,
        file_type: asset.file_type,
        file_size: asset.file_size,
        created_at: asset.created_at,
      }];
    }
    
    onUpdate({ selectedAssets: newSelectedAssets });
  }, [data.selectedAssets, maximumAssets, onUpdate]);

  // Handle select all/none
  const handleSelectAll = useCallback(() => {
    const availableAssets = filteredAssets.slice(0, maximumAssets || filteredAssets.length);
    const allSelected = availableAssets.length > 0 && 
                       availableAssets.every(asset => 
                         data.selectedAssets.some(a => a.id === asset.id)
                       );
    
    if (allSelected) {
      // Deselect all filtered assets
      const newSelectedAssets = data.selectedAssets.filter(selected =>
        !availableAssets.some(asset => asset.id === selected.id)
      );
      onUpdate({ selectedAssets: newSelectedAssets });
    } else {
      // Select available assets up to limit
      const newAssets = availableAssets
        .filter(asset => !data.selectedAssets.some(a => a.id === asset.id))
        .map(asset => ({
          id: asset.id,
          name: asset.title,
          file_type: asset.file_type,
          file_size: asset.file_size,
          created_at: asset.created_at,
        }));
      
      const remainingSlots = (maximumAssets || Infinity) - data.selectedAssets.length;
      const assetsToAdd = newAssets.slice(0, remainingSlots);
      
      onUpdate({ selectedAssets: [...data.selectedAssets, ...assetsToAdd] });
    }
  }, [filteredAssets, data.selectedAssets, maximumAssets, onUpdate]);

  const getFileIcon = (fileType: string) => {
    const IconComponent = FILE_TYPE_ICONS[fileType as keyof typeof FILE_TYPE_ICONS] || FILE_TYPE_ICONS.default;
    return IconComponent;
  };

  const selectedCount = data.selectedAssets.length;
  const totalFilteredAssets = filteredAssets.length;
  const meetsMinimum = selectedCount >= minimumAssets;
  const atMaximum = maximumAssets ? selectedCount >= maximumAssets : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Select Assets for Analysis
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose the documents you want to analyze with {selectedGoal?.title}
        </p>
      </div>

      {/* Goal Requirements */}
      {selectedGoal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Requirements for "{selectedGoal.title}"
              </h4>
              <div className="space-y-1 text-sm text-blue-700">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={cn(
                    "w-4 h-4",
                    meetsMinimum ? "text-green-600" : "text-gray-400"
                  )} />
                  <span>
                    Minimum {minimumAssets} asset{minimumAssets > 1 ? 's' : ''} required
                    {selectedCount > 0 && ` (${selectedCount}/${minimumAssets})`}
                  </span>
                </div>
                {maximumAssets && (
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Maximum {maximumAssets} assets allowed</span>
                  </div>
                )}
                {supportedTypes && (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>
                      Supported types: {supportedTypes.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="filter">Filter:</Label>
          <select 
            id="filter"
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FILE_TYPE_FILTERS.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <div className={cn(
          "flex items-center justify-between p-3 border rounded-lg",
          meetsMinimum 
            ? "bg-green-50 border-green-200" 
            : "bg-yellow-50 border-yellow-200"
        )}>
          <div className="flex items-center space-x-2">
            <Check className={cn(
              "w-5 h-5",
              meetsMinimum ? "text-green-600" : "text-yellow-600"
            )} />
            <span className={cn(
              "font-medium",
              meetsMinimum ? "text-green-800" : "text-yellow-800"
            )}>
              {selectedCount} asset{selectedCount !== 1 ? 's' : ''} selected
              {!meetsMinimum && ` (need ${minimumAssets - selectedCount} more)`}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({ selectedAssets: [] })}
            className={cn(
              meetsMinimum 
                ? "text-green-600 border-green-300 hover:bg-green-100"
                : "text-yellow-600 border-yellow-300 hover:bg-yellow-100"
            )}
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Assets List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">
              Error Loading Assets
            </h4>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">
              No Compatible Assets Available
            </h4>
            <p className="text-gray-500 mb-4">
              {supportedTypes 
                ? `No ${supportedTypes.join(', ')} files found in your organization.`
                : 'Upload some documents to your organization first.'
              }
            </p>
            <Button variant="outline" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload Assets</span>
            </Button>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">
              No Assets Found
            </h4>
            <p className="text-gray-500">
              {searchTerm 
                ? `No assets match "${searchTerm}" with the current filter`
                : 'No assets match the current filter'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Select All Control */}
            {totalFilteredAssets > 0 && (
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={filteredAssets.slice(0, maximumAssets || filteredAssets.length).every(asset => 
                      data.selectedAssets.some(a => a.id === asset.id)
                    )}
                    onCheckedChange={handleSelectAll}
                    disabled={atMaximum}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select all {Math.min(totalFilteredAssets, maximumAssets || totalFilteredAssets)} visible assets
                    {maximumAssets && totalFilteredAssets > maximumAssets && (
                      <span className="text-gray-500 ml-1">
                        (limited to {maximumAssets})
                      </span>
                    )}
                  </Label>
                </div>
              </div>
            )}

            {/* Assets Grid */}
            <div className="grid grid-cols-1 gap-4">
              {filteredAssets.map((asset) => {
                const isSelected = data.selectedAssets.some(a => a.id === asset.id);
                const canSelect = !atMaximum || isSelected;
                const FileIcon = getFileIcon(asset.file_type);
                
                return (
                  <motion.div
                    key={asset.id}
                    whileHover={{ scale: canSelect ? 1.01 : 1 }}
                    whileTap={{ scale: canSelect ? 0.99 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        canSelect && "hover:shadow-md",
                        !canSelect && "opacity-50 cursor-not-allowed",
                        isSelected && "ring-2 ring-green-500 bg-green-50"
                      )}
                      onClick={() => canSelect && handleAssetToggle(asset)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          {/* Checkbox */}
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}} // Handled by card click
                            disabled={!canSelect}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          
                          {/* File Icon */}
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            isSelected ? "bg-green-100" : "bg-gray-100"
                          )}>
                            <FileIcon className={cn(
                              "w-6 h-6",
                              isSelected ? "text-green-600" : "text-gray-500"
                            )} />
                          </div>
                          
                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {asset.title}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {asset.file_name}
                            </p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span>{formatBytes(asset.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(asset.created_at)}</span>
                              <span>•</span>
                              <Badge 
                                variant={asset.status === 'ready' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {asset.status}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Assets Summary */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Selected Assets ({selectedCount}{maximumAssets && `/${maximumAssets}`})
            </h4>
            <div className="text-sm text-gray-600">
              Total size: {formatBytes(
                data.selectedAssets.reduce((sum, asset) => sum + asset.file_size, 0)
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.selectedAssets.map((asset) => {
              const FileIcon = getFileIcon(asset.file_type);
              return (
                <div 
                  key={asset.id}
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border"
                >
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <FileIcon className="w-4 h-4 text-green-600" />
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
                    onClick={() => handleAssetToggle({ 
                      id: asset.id,
                      title: asset.name,
                      file_name: asset.name,
                      file_type: asset.file_type,
                      file_size: asset.file_size,
                      created_at: asset.created_at,
                      updated_at: asset.created_at,
                      status: 'ready',
                      uploaded_by: '',
                      organization_id: ''
                    } as Asset)}
                    className="p-1 h-auto text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Analysis Preview */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className={cn(
                  "flex items-center space-x-1",
                  meetsMinimum ? "text-green-600" : "text-yellow-600"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {meetsMinimum ? 'Ready for analysis' : `Need ${minimumAssets - selectedCount} more`}
                  </span>
                </span>
                {data.instrumentConfig.processingConfig.estimatedTime && (
                  <span className="text-gray-500">
                    Est. processing time: {data.instrumentConfig.processingConfig.estimatedTime}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}