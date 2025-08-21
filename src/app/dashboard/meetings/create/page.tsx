'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateMeetingWizard, { type MeetingWizardData } from '@/features/meetings/CreateMeetingWizard';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function CreateMeetingPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();

  // Redirect if no organization is selected
  useEffect(() => {
    if (!currentOrganization) {
      router.push('/dashboard/organizations');
    }
  }, [currentOrganization, router]);

  const handleCreateMeeting = async (data: MeetingWizardData) => {
    try {
      console.log('Creating meeting with data:', data);
      // TODO: Implement actual API call to create meeting
      // await meetingService.createMeeting(data);
      
      // Redirect to meetings list on success
      router.push('/dashboard/meetings');
    } catch (error) {
      console.error('Failed to create meeting:', error);
      throw error;
    }
  };

  const handleClose = () => {
    router.push('/dashboard/meetings');
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