'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { 
  Users, 
  Star, 
  Clock, 
  MapPin, 
  Globe, 
  MessageCircle, 
  Calendar,
  TrendingUp,
  Award,
  Target,
  Search,
  Filter
} from 'lucide-react';

interface MentorMatch {
  user_id: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  bio: string;
  expertise_areas: string[];
  industries: string[];
  board_roles: string[];
  years_experience: number;
  languages: string[];
  time_zone: string;
  match_score: number;
  matching_reasons: string[];
  average_satisfaction?: number;
  total_mentorships?: number;
}

interface MentorshipRelationship {
  id: string;
  status: string;
  match_score?: number;
  start_date?: string;
  mentor: {
    user: {
      first_name: string;
      last_name: string;
      email: string;
      avatar_url?: string;
    };
    bio: string;
    expertise_areas: string[];
  };
  recent_sessions?: Array<{
    id: string;
    scheduled_at: string;
    status: string;
  }>;
}

interface MentorMatchingDashboardProps {
  userId: string;
}

export default function MentorMatchingDashboard({ userId }: MentorMatchingDashboardProps) {
  const [matches, setMatches] = useState<MentorMatch[]>([]);
  const [relationships, setRelationships] = useState<MentorshipRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch mentor matches
      const matchesResponse = await fetch(`/api/mentoring/matches?mentee_id=${userId}&limit=8`);
      if (matchesResponse.ok) {
        const matchesResult = await matchesResponse.json();
        setMatches(matchesResult.data);
      }

      // Fetch existing relationships
      const relationshipsResponse = await fetch(`/api/mentoring/relationships?user_id=${userId}&role=mentee`);
      if (relationshipsResponse.ok) {
        const relationshipsResult = await relationshipsResponse.json();
        setRelationships(relationshipsResult.data);
      }
    } catch (error) {
      console.error('Error fetching mentor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMentorship = async (mentorId: string) => {
    try {
      const response = await fetch('/api/mentoring/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentor_id: mentorId,
          goals: ['Develop board leadership skills', 'Improve governance knowledge'],
          program_duration_months: 6,
          meeting_frequency: 'monthly'
        })
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to request mentorship');
      }
    } catch (error) {
      console.error('Error requesting mentorship:', error);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
      paused: { color: 'bg-gray-100 text-gray-800', label: 'Paused' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Finding your ideal mentors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mentorship Program</h1>
        <p className="text-gray-600">Connect with experienced board members to accelerate your development</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matches">Recommended Mentors</TabsTrigger>
          <TabsTrigger value="relationships">My Mentorships</TabsTrigger>
          <TabsTrigger value="sessions">Upcoming Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Recommended Mentors for You
              </CardTitle>
              <CardDescription>
                Based on your profile, goals, and preferences, here are mentors who would be a great fit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mentor Matches</h3>
                  <p className="text-gray-600">
                    Complete your profile to get personalized mentor recommendations.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.map((mentor) => (
                    <Card key={mentor.user_id} className="relative">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={mentor.user.avatar_url} />
                            <AvatarFallback>
                              {mentor.user.first_name[0]}{mentor.user.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">
                                {mentor.user.first_name} {mentor.user.last_name}
                              </h3>
                              <Badge className={getMatchScoreColor(mentor.match_score)}>
                                {mentor.match_score}% match
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {mentor.bio}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-1 text-gray-600 mb-1">
                              <TrendingUp className="w-3 h-3" />
                              Experience
                            </div>
                            <p className="font-medium">{mentor.years_experience} years</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-gray-600 mb-1">
                              <Award className="w-3 h-3" />
                              Rating
                            </div>
                            <div className="flex items-center gap-1">
                              {mentor.average_satisfaction && (
                                <>
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">
                                    {mentor.average_satisfaction.toFixed(1)}
                                  </span>
                                </>
                              )}
                              {!mentor.average_satisfaction && (
                                <span className="text-gray-500">New mentor</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Areas of Expertise</h4>
                          <div className="flex flex-wrap gap-1">
                            {mentor.expertise_areas.slice(0, 3).map((area) => (
                              <Badge key={area} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                            {mentor.expertise_areas.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{mentor.expertise_areas.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Why This Match</h4>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {mentor.matching_reasons.slice(0, 2).map((reason, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <Target className="w-2 h-2 mt-1 flex-shrink-0" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {mentor.languages.join(', ')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {mentor.time_zone}
                          </span>
                        </div>

                        <div className="pt-2">
                          <Button 
                            className="w-full" 
                            onClick={() => handleRequestMentorship(mentor.user_id)}
                          >
                            Request Mentorship
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Mentorship Relationships
              </CardTitle>
              <CardDescription>
                Track your ongoing and past mentoring relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mentorship Relationships</h3>
                  <p className="text-gray-600">
                    Request mentorship from recommended mentors to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {relationships.map((relationship) => (
                    <Card key={relationship.id} className="border-l-4 border-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={relationship.mentor.user.avatar_url} />
                              <AvatarFallback>
                                {relationship.mentor.user.first_name[0]}{relationship.mentor.user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">
                                {relationship.mentor.user.first_name} {relationship.mentor.user.last_name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {relationship.mentor.bio.substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(relationship.status)}
                            {relationship.match_score && (
                              <div className="text-xs text-gray-500 mt-1">
                                {relationship.match_score}% compatibility
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {relationship.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Started {new Date(relationship.start_date).toLocaleDateString()}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {relationship.mentor.expertise_areas.slice(0, 2).map((area) => (
                                <Badge key={area} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                            {relationship.status === 'active' && (
                              <Button size="sm">
                                <Calendar className="w-3 h-3 mr-1" />
                                Schedule Session
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Mentoring Sessions
              </CardTitle>
              <CardDescription>
                Your scheduled mentoring sessions and meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Sessions</h3>
                <p className="text-gray-600">
                  Schedule sessions with your mentors to continue your development journey.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}