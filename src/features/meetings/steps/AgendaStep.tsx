'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Textarea } from '@/features/shared/ui/textarea';
import { Badge } from '@/features/shared/ui/badge';
import { 
  Plus,
  FileText,
  Upload,
  Clock,
  GripVertical,
  Trash2,
  Edit3,
  Lock,
  Presentation,
  MessageSquare,
  CheckCircle,
  Info,
  Coffee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingWizardData } from '../CreateMeetingWizard';

interface AgendaStepProps {
  data: MeetingWizardData;
  onUpdate: (_updates: Partial<MeetingWizardData>) => void;
}

const AGENDA_ITEM_TYPES = [
  { value: 'presentation', label: 'Presentation', icon: Presentation, color: 'bg-blue-500' },
  { value: 'discussion', label: 'Discussion', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'decision', label: 'Decision', icon: CheckCircle, color: 'bg-purple-500' },
  { value: 'information', label: 'Information', icon: Info, color: 'bg-gray-500' },
  { value: 'break', label: 'Break', icon: Coffee, color: 'bg-orange-500' },
] as const;


// Default agenda templates based on meeting type
const getDefaultAgenda = (meetingType: string) => {
  switch (meetingType) {
    case 'agm':
      return [
        { title: 'Registration and Welcome', type: 'information', duration: 15 },
        { title: 'Call to Order', type: 'information', duration: 5 },
        { title: 'Annual Report Presentation', type: 'presentation', duration: 30 },
        { title: 'Financial Statements Review', type: 'presentation', duration: 25 },
        { title: 'Auditor Report', type: 'presentation', duration: 15 },
        { title: 'Director Elections', type: 'decision', duration: 20 },
        { title: 'Shareholder Proposals', type: 'discussion', duration: 30 },
        { title: 'Q&A Session', type: 'discussion', duration: 25 },
        { title: 'Closing Remarks', type: 'information', duration: 10 },
      ];
    case 'board':
      return [
        { title: 'Call to Order', type: 'information', duration: 5 },
        { title: 'Approval of Previous Minutes', type: 'decision', duration: 10 },
        { title: 'CEO Report', type: 'presentation', duration: 20 },
        { title: 'Financial Report', type: 'presentation', duration: 15 },
        { title: 'Strategic Initiatives Update', type: 'discussion', duration: 30 },
        { title: 'Risk Management Review', type: 'discussion', duration: 20 },
        { title: 'New Business', type: 'discussion', duration: 15 },
        { title: 'Executive Session', type: 'discussion', duration: 15 },
        { title: 'Adjournment', type: 'information', duration: 5 },
      ];
    case 'committee':
      return [
        { title: 'Call to Order', type: 'information', duration: 3 },
        { title: 'Review of Action Items', type: 'discussion', duration: 10 },
        { title: 'Main Discussion Topic', type: 'discussion', duration: 30 },
        { title: 'Decisions Required', type: 'decision', duration: 15 },
        { title: 'Next Steps', type: 'discussion', duration: 10 },
        { title: 'Next Meeting Date', type: 'information', duration: 2 },
      ];
    default:
      return [
        { title: 'Welcome and Introductions', type: 'information', duration: 10 },
        { title: 'Main Topic Discussion', type: 'discussion', duration: 30 },
        { title: 'Action Items', type: 'discussion', duration: 15 },
        { title: 'Next Steps', type: 'information', duration: 5 },
      ];
  }
};

export default function AgendaStep({ data, onUpdate }: AgendaStepProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    type: 'discussion' as any,
    estimatedDuration: 15,
    presenter: '',
  });

  // Load default agenda if no items exist
  React.useEffect(() => {
    if (data.agendaItems.length === 0) {
      const defaultItems = getDefaultAgenda(data.meetingType);
      const agendaItems = defaultItems.map((item, index) => ({
        id: `default-${index}`,
        title: item.title,
        description: '',
        type: item.type as any,
        estimatedDuration: item.duration,
        presenter: '',
        order: index,
      }));
      onUpdate({ agendaItems });
    }
  }, [data.meetingType, data.agendaItems.length, onUpdate]);

  const handleAddItem = () => {
    const item = {
      id: `item-${Date.now()}`,
      ...newItem,
      order: data.agendaItems.length,
    };
    
    onUpdate({
      agendaItems: [...data.agendaItems, item],
    });
    
    setNewItem({
      title: '',
      description: '',
      type: 'discussion',
      estimatedDuration: 15,
      presenter: '',
    });
    setIsAddingItem(false);
  };

  const handleUpdateItem = (itemId: string, updates: any) => {
    const updatedItems = data.agendaItems.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdate({ agendaItems: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = data.agendaItems
      .filter(item => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index }));
    onUpdate({ agendaItems: updatedItems });
  };

  // Commented out unused function - keeping for future implementation
  // const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
  //   const currentIndex = data.agendaItems.findIndex(item => item.id === itemId);
  //   if (currentIndex === -1) return;

  //   const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  //   if (newIndex < 0 || newIndex >= data.agendaItems.length) return;

  //   const updatedItems = [...data.agendaItems];
  //   [updatedItems[currentIndex], updatedItems[newIndex]] = 
  //   [updatedItems[newIndex]!, updatedItems[currentIndex]!];
    
  //   // Update order indices
  //   updatedItems.forEach((item, index) => {
  //     item.order = index;
  //   });

  //   onUpdate({ agendaItems: updatedItems });
  // };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newDocuments = files.map((file: File) => ({
      id: `doc-${Date.now()}-${Math.random()}`,
      name: (file as File).name,
      file,
      category: 'supporting' as const,
      isConfidential: false,
    }));
    
    onUpdate({
      documents: [...data.documents, ...newDocuments],
    });
  };

  const totalDuration = data.agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Set Your Agenda & Documents
        </h3>
        <p className="text-gray-600">
          Plan your meeting structure and attach supporting documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Meeting Agenda</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.agendaItems.map((item, index) => {
                const itemType = AGENDA_ITEM_TYPES.find(t => t.value === item.type);
                const isEditing = editingItem === item.id;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <span className="text-xs text-gray-500">{index + 1}</span>
                    </div>
                    
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                            placeholder="Agenda item title"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={item.type}
                              onChange={(e) => handleUpdateItem(item.id, { type: e.target.value })}
                              className="px-3 py-2 border rounded-md text-sm"
                            >
                              {AGENDA_ITEM_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="number"
                              value={item.estimatedDuration}
                              onChange={(e) => handleUpdateItem(item.id, { estimatedDuration: parseInt(e.target.value) || 0 })}
                              placeholder="Duration (min)"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => setEditingItem(null)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <div className={cn("p-1 rounded text-white", itemType?.color)}>
                              {itemType?.icon && <itemType.icon className="h-3 w-3" />}
                            </div>
                            <h4 className="font-medium">{item.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.estimatedDuration}m
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          {item.presenter && (
                            <p className="text-xs text-gray-500 mt-1">
                              Presenter: {item.presenter}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItem(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Add New Item Form */}
              {isAddingItem && (
                <div className="p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                  <div className="space-y-3">
                    <Input
                      placeholder="Agenda item title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newItem.type}
                        onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                        className="px-3 py-2 border rounded-md text-sm"
                      >
                        {AGENDA_ITEM_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        placeholder="Duration (min)"
                        value={newItem.estimatedDuration}
                        onChange={(e) => setNewItem({ ...newItem, estimatedDuration: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <Input
                      placeholder="Presenter (optional)"
                      value={newItem.presenter}
                      onChange={(e) => setNewItem({ ...newItem, presenter: e.target.value })}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleAddItem}
                        disabled={!newItem.title.trim()}
                      >
                        Add Item
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingItem(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Documents</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="document-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  />
                  <label
                    htmlFor="document-upload"
                    className="cursor-pointer"
                  >
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload documents
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, PPT, XLS supported
                    </p>
                  </label>
                </div>

                {/* Document List */}
                {data.documents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Uploaded Documents ({data.documents.length})
                    </h4>
                    {data.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center space-x-2 p-2 border rounded text-sm"
                      >
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.category}</p>
                        </div>
                        {doc.isConfidential && (
                          <Lock className="h-3 w-3 text-red-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const updatedDocs = data.documents.filter(d => d.id !== doc.id);
                            onUpdate({ documents: updatedDocs });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}