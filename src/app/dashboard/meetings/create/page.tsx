'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateMeetingWizard, { type MeetingWizardData } from '@/features/meetings/CreateMeetingWizard';
import MeetingCreatedSuccess from '@/features/meetings/MeetingCreatedSuccess';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/components/ui/use-toast';

export default function CreateMeetingPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Redirect if no organization is selected
  useEffect(() => {
    if (!currentOrganization) {
      router.push('/dashboard/organizations');
    }
  }, [currentOrganization, router]);

  const handleCreateMeeting = async (data: MeetingWizardData) => {
    setIsCreating(true);
    try {
      console.log('Creating meeting with data:', data);
      
      // Prepare the request payload
      const payload = {
        organizationId: currentOrganization!.id,
        boardId: data.boardId || null,
        committeeId: data.committeeId || null,
        title: data.title,
        description: data.description,
        meetingType: data.meetingType,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        timezone: data.timezone,
        location: data.location,
        virtualMeetingUrl: data.virtualMeetingUrl,
        isHybrid: !!data.location && !!data.virtualMeetingUrl,
        agendaItems: data.agendaItems.map((item, index) => ({
          title: item.title,
          description: item.description,
          type: item.type,
          estimatedDuration: item.estimatedDuration,
          presenter: item.presenter,
          order: item.order || index + 1
        })),
        invitees: data.invitees.map(invitee => ({
          userId: invitee.userId,
          email: invitee.email,
          name: invitee.name,
          role: invitee.role,
          isRequired: invitee.isRequired,
          canVote: invitee.canVote
        })),
        settings: {
          allowGuests: data.settings.allowVirtualAttendance,
          recordMeeting: data.settings.autoRecord,
          autoGenerateMinutes: false,
          requireRsvp: data.settings.requireRSVP,
          allowProxyVoting: false,
          publicMeeting: false
        }
      };

      // Make API call to create meeting
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create meeting');
      }

      console.log('Meeting created successfully:', result.data);
      
      // Show success notification
      toast({
        title: 'Meeting created successfully!',
        description: `${result.data.title} has been scheduled for ${new Date(result.data.scheduled_start).toLocaleDateString()}`,
        variant: 'success',
      });

      // Set the created meeting to show success screen
      setCreatedMeeting(result.data);
      
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast({
        title: 'Failed to create meeting',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    router.push('/dashboard/meetings');
  };

  const handleCreateAnother = () => {
    setCreatedMeeting(null);
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Organization Required
          </h2>
          <p className="text-gray-600">
            Please select an organization before creating a meeting.
          </p>
        </div>
      </div>
    );
  }

  // Show success screen if meeting was created
  if (createdMeeting) {
    return (
      <MeetingCreatedSuccess
        meeting={createdMeeting}
        onClose={handleClose}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  return (
    <CreateMeetingWizard
      isOpen={true}
      onClose={handleClose}
      onComplete={handleCreateMeeting}
      organizationId={currentOrganization.id}
      isFullPage={true}
    />
  );
}