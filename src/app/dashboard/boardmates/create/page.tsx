'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateBoardMatesWizard from '@/features/boardmates/CreateBoardMatesWizard';
import { CreateBoardMateRequest, BoardMateCreationResponse } from '@/features/boardmates/types';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { ArrowLeft, CheckCircle2, Users, Mail, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function CreateBoardMatePage() {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [createdBoardMate, setCreatedBoardMate] = useState<BoardMateCreationResponse | null>(null);

  const handleCreateBoardMate = async (data: CreateBoardMateRequest): Promise<void> => {
    try {
      // TODO: Get current user ID and organization ID from auth context/session
      const currentUserId = 'temp-user-id'; // Replace with actual user ID
      const currentOrgId = 'temp-org-id'; // Replace with actual organization ID

      const response = await fetch('/api/boardmates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          createdBy: currentUserId,
          organizationId: currentOrgId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create BoardMate');
      }

      const result: { data: BoardMateCreationResponse } = await response.json();
      
      setCreatedBoardMate(result.data);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error creating BoardMate:', error);
      throw error; // Re-throw to let the wizard handle the error display
    }
  };

  const handleGoToBoardMates = () => {
    router.push('/dashboard/boardmates');
  };

  const handleCreateAnother = () => {
    setIsCompleted(false);
    setCreatedBoardMate(null);
  };

  if (isCompleted && createdBoardMate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              BoardMate Added Successfully!
            </h1>
            
            <p className="text-gray-600 mb-6">
              <strong>{createdBoardMate.boardMate?.fullName}</strong> has been added to your organization 
              {createdBoardMate.emailSent ? ' and will receive an invitation email shortly.' : '.'}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-blue-900">
                    {createdBoardMate.boardMate?.fullName}
                  </p>
                  <p className="text-sm text-blue-700">
                    {createdBoardMate.boardMate?.role} • {createdBoardMate.boardMate?.email}
                  </p>
                </div>
              </div>
            </div>

            {createdBoardMate.invitation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  {createdBoardMate.emailSent ? (
                    <Mail className="w-5 h-5 text-green-600" />
                  ) : (
                    <UserPlus className="w-5 h-5 text-green-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-green-800">
                      {createdBoardMate.emailSent ? 'Invitation Email Sent' : 'Invitation Created'}
                    </p>
                    <p className="text-sm text-green-700">
                      {createdBoardMate.emailSent 
                        ? 'They will receive setup instructions and can create their account.'
                        : 'Invitation is ready. You can manually share the invitation link.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleGoToBoardMates}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                View All BoardMates
              </Button>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleCreateAnother}
                  className="flex-1"
                >
                  Add Another BoardMate
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
              <div className="text-sm text-gray-600 space-y-2">
                {createdBoardMate.emailSent ? (
                  <>
                    <p>✓ BoardMate will receive an email with setup instructions</p>
                    <p>✓ They can create their account and join your organization</p>
                    <p>✓ Access will be granted based on configured permissions</p>
                    <p>✓ You'll be notified when they accept the invitation</p>
                  </>
                ) : (
                  <>
                    <p>✓ BoardMate contact information has been saved</p>
                    <p>• You can manually share the invitation link</p>
                    <p>• Configure additional permissions if needed</p>
                    <p>• Send follow-up communications as required</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/dashboard/boardmates"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to BoardMates</span>
            </Link>
            
            <h1 className="text-xl font-semibold text-gray-900">
              Add New BoardMate
            </h1>
            
            <div className="w-32"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      <CreateBoardMatesWizard
        isOpen={true}
        onClose={() => router.push('/dashboard/boardmates')}
        onComplete={handleCreateBoardMate}
        className="border-none shadow-none bg-transparent max-w-none max-h-none overflow-visible"
      />
    </div>
  );
}