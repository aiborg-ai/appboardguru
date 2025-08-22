'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { BarChart3, Users, Clock, TrendingUp, MessageSquare } from 'lucide-react';
import { MeetingAnalytics, MeetingDetailsFull } from '@/types/meeting-details';

interface MeetingInsightsProps {
  analytics?: MeetingAnalytics;
  meeting: MeetingDetailsFull;
  onRefresh: () => void;
}

export const MeetingInsights = React.memo(function MeetingInsights({
  analytics,
  meeting,
  onRefresh
}: MeetingInsightsProps) {
  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Meeting Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analytics will be available during and after the meeting</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Meeting Insights & Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Participation Score */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(analytics.participation.participationScore * 100)}%
            </div>
            <div className="text-sm text-blue-600">Participation Score</div>
          </div>

          {/* Duration Efficiency */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Clock className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">
              {Math.round(analytics.duration.efficiency * 100)}%
            </div>
            <div className="text-sm text-green-600">Time Efficiency</div>
          </div>

          {/* Engagement Level */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">
              {analytics.engagement.questionsAsked}
            </div>
            <div className="text-sm text-purple-600">Questions Asked</div>
          </div>

          {/* Productivity Score */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(analytics.productivity.productivityScore * 100)}%
            </div>
            <div className="text-sm text-orange-600">Productivity Score</div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Participation Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Attendance Rate</span>
                <span className="font-medium">{Math.round(analytics.participation.attendanceRate * 100)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Average Speaking Time</span>
                <span className="font-medium">{analytics.participation.averageSpeakingTime} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Documents Viewed</span>
                <span className="font-medium">{analytics.engagement.documentsViewed}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Meeting Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Agenda Items Completed</span>
                <span className="font-medium">{analytics.productivity.agendaItemsCompleted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Action Items Created</span>
                <span className="font-medium">{analytics.productivity.actionItemsCreated}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Resolutions Passed</span>
                <span className="font-medium">{analytics.decisions.resolutionsPassed}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});