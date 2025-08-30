'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Check, Search, Loader2 } from 'lucide-react';
import { VaultWizardData } from '../CreateVaultWizard';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

interface OrganizationStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

export default function OrganizationStep({ data, onUpdate }: OrganizationStepProps) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    description: '',
    industry: '',
    website: ''
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('Loading organizations for user:', user.id, user.email);

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      console.log('Organization members query result:', {
        orgMembers,
        count: orgMembers?.length,
        raw: JSON.stringify(orgMembers, null, 2)
      });

      if (orgMembers) {
        const orgs = orgMembers
          .map(m => m.organization)
          .filter(Boolean);
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error('Error loading organizations:', {
        error,
        userId: user?.id,
        userEmail: user?.email
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = (org: any) => {
    onUpdate({
      selectedOrganization: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      createNewOrganization: null
    });
  };

  const handleCreateNewOrganization = () => {
    if (!newOrgData.name.trim()) return;
    
    onUpdate({
      selectedOrganization: null,
      createNewOrganization: newOrgData
    });
    setShowCreateForm(false);
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          Select or Create Organization
        </h3>
        <p className="text-sm text-gray-600">
          Choose an existing organization or create a new one for your vault
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && organizations.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-2">
            No organizations found. This might be because the test data hasn't been seeded.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const response = await fetch('/api/seed-organizations', {
                method: 'POST'
              });
              const data = await response.json();
              console.log('Seed result:', data);
              loadOrganizations(); // Refresh the list
            }}
          >
            Seed Test Organizations
          </Button>
        </div>
      )}

      {!showCreateForm ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrganizations.map((org) => {
              const isSelected = data.selectedOrganization?.id === org.id;
              
              return (
                <Card
                  key={org.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    isSelected && "ring-2 ring-blue-500 bg-blue-50"
                  )}
                  onClick={() => handleSelectOrganization(org)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{org.name}</h4>
                          {org.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {org.description}
                            </p>
                          )}
                          {org.industry && (
                            <Badge variant="secondary" className="mt-2">
                              {org.industry}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card
              className="cursor-pointer border-dashed hover:bg-gray-50 transition-colors"
              onClick={() => setShowCreateForm(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-center h-full min-h-[100px]">
                  <div className="text-center">
                    <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      Create New Organization
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Set up a new organization for your board
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <h4 className="font-medium text-gray-900 mb-4">
              Create New Organization
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="org-description">Description</Label>
                <Textarea
                  id="org-description"
                  placeholder="Brief description of the organization"
                  value={newOrgData.description}
                  onChange={(e) => setNewOrgData({ ...newOrgData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="org-industry">Industry</Label>
                <Select
                  value={newOrgData.industry}
                  onValueChange={(value) => setNewOrgData({ ...newOrgData, industry: value })}
                >
                  <SelectTrigger id="org-industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="org-website">Website</Label>
                <Input
                  id="org-website"
                  type="url"
                  placeholder="https://example.com"
                  value={newOrgData.website}
                  onChange={(e) => setNewOrgData({ ...newOrgData, website: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateNewOrganization}
                  disabled={!newOrgData.name.trim()}
                >
                  Create Organization
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.selectedOrganization && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Selected:</strong> {data.selectedOrganization.name}
          </p>
        </div>
      )}

      {data.createNewOrganization && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900">
            <strong>Will create:</strong> {data.createNewOrganization.name}
          </p>
        </div>
      )}
    </div>
  );
}