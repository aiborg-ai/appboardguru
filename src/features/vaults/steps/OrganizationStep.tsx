'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Textarea } from '@/features/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Badge } from '@/features/shared/ui/badge';
import { Separator } from '@/features/shared/ui/separator';
import { 
  Building2, 
  Plus, 
  Search, 
  Check,
  Users,
  Globe,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VaultWizardData } from '../CreateVaultWizard';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  website?: string;
  created_at: string;
  member_count: number;
  vault_count: number;
  settings: {
    organization_size?: string;
  };
}

interface OrganizationStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Legal',
  'Consulting',
  'Non-Profit',
  'Government',
  'Other'
];

export default function OrganizationStep({ data, onUpdate }: OrganizationStepProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
  });

  // Load organizations
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter organizations based on search
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle organization selection
  const handleSelectOrganization = (org: Organization) => {
    onUpdate({
      selectedOrganization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      createNewOrganization: null,
    });
  };

  // Handle create new organization toggle
  const handleToggleCreateForm = () => {
    setShowCreateForm(!showCreateForm);
    if (!showCreateForm) {
      // Clear selected organization when starting to create new one
      onUpdate({
        selectedOrganization: null,
        createNewOrganization: createFormData.name ? createFormData : null,
      });
    } else {
      // Clear new organization data when canceling
      onUpdate({
        createNewOrganization: null,
      });
      setCreateFormData({ name: '', description: '', industry: '', website: '' });
    }
  };

  // Handle create form changes
  const handleCreateFormChange = (field: string, value: string) => {
    const newFormData = { ...createFormData, [field]: value };
    setCreateFormData(newFormData);
    
    // Update wizard data if form has required fields
    if (newFormData.name && newFormData.industry) {
      onUpdate({
        createNewOrganization: newFormData,
        selectedOrganization: null,
      });
    }
  };

  const selectedOrg = data.selectedOrganization;
  const hasNewOrgData = data.createNewOrganization;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Choose Your Organization
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Select an existing organization or create a new one for your vault
        </p>
      </div>

      {/* Search and Create Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showCreateForm ? "default" : "outline"}
          onClick={handleToggleCreateForm}
          className="flex items-center space-x-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? "Cancel" : "Create New"}</span>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showCreateForm ? (
          // Create New Organization Form
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Create New Organization</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name *</Label>
                    <Input
                      id="org-name"
                      placeholder="Enter organization name"
                      value={createFormData.name}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-industry">Industry *</Label>
                    <Select 
                      value={createFormData.industry} 
                      onValueChange={(value) => handleCreateFormChange('industry', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(industry => (
                          <SelectItem key={industry} value={industry.toLowerCase()}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea
                    id="org-description"
                    placeholder="Brief description of your organization"
                    value={createFormData.description}
                    onChange={(e) => handleCreateFormChange('description', e.target.value)}
                    className="bg-white"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="org-website">Website</Label>
                  <Input
                    id="org-website"
                    type="url"
                    placeholder="https://example.com"
                    value={createFormData.website}
                    onChange={(e) => handleCreateFormChange('website', e.target.value)}
                    className="bg-white"
                  />
                </div>

                {hasNewOrgData && (
                  <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Ready to create "{createFormData.name}"
                      </p>
                      <p className="text-sm text-green-600">
                        This organization will be created when you complete the vault setup.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Existing Organizations List
          <motion.div
            key="organizations-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredOrganizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrganizations.map((org) => (
                  <motion.div
                    key={org.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        selectedOrg?.id === org.id && "ring-2 ring-blue-500 bg-blue-50"
                      )}
                      onClick={() => handleSelectOrganization(org)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {org.name}
                            </h4>
                            {org.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {org.description}
                              </p>
                            )}
                          </div>
                          {selectedOrg?.id === org.id && (
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center ml-2">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{org.member_count} members</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Building2 className="w-3 h-3" />
                              <span>{org.vault_count} vaults</span>
                            </div>
                          </div>
                          {org.industry && (
                            <Badge variant="secondary" className="text-xs">
                              {org.industry}
                            </Badge>
                          )}
                        </div>

                        {org.website && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Globe className="w-3 h-3 text-gray-400" />
                            <a 
                              href={org.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {org.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-600 mb-2">
                  {searchTerm ? 'No organizations found' : 'No organizations yet'}
                </h4>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? `No organizations match "${searchTerm}"`
                    : 'Get started by creating your first organization'
                  }
                </p>
                <Button
                  variant="outline"
                  onClick={handleToggleCreateForm}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Organization</span>
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Organization Summary */}
      {selectedOrg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Selected Organization</span>
          </div>
          <p className="text-green-700">
            Your vault will be created under <strong>{selectedOrg.name}</strong>
          </p>
        </motion.div>
      )}
    </div>
  );
}