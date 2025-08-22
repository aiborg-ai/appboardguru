'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Input } from '@/features/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { 
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Video,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  UserCheck,
  UserX,
  UserClock,
  Crown,
  Shield,
  Eye,
  MoreVertical,
  Calendar,
  Award,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantWithUser } from '@/types/meeting-details';

const ROLE_CONFIG = {
  chairperson: {
    label: 'Chairperson',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Crown,
    priority: 1
  },
  secretary: {
    label: 'Secretary',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Shield,
    priority: 2
  },
  director: {
    label: 'Director',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Award,
    priority: 3
  },
  member: {
    label: 'Member',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: UserCheck,
    priority: 4
  },
  observer: {
    label: 'Observer',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Eye,
    priority: 5
  },
  advisor: {
    label: 'Advisor',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: MessageSquare,
    priority: 6
  },
  guest: {
    label: 'Guest',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Users,
    priority: 7
  }
};

const ATTENDANCE_STATUS_CONFIG = {
  accepted: {
    label: 'Accepted',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  declined: {
    label: 'Declined',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  tentative: {
    label: 'Tentative',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  pending: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock
  },
  no_response: {
    label: 'No Response',
    color: 'bg-gray-100 text-gray-500',
    icon: Clock
  }
};

const PRESENCE_CONFIG = {
  present: {
    label: 'Present',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  virtual: {
    label: 'Virtual',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    icon: Video
  },
  late: {
    label: 'Late',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    icon: UserClock
  },
  absent: {
    label: 'Absent',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    icon: UserX
  },
  left_early: {
    label: 'Left Early',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    icon: UserX
  }
};

interface ParticipantsPanelProps {
  participants: ParticipantWithUser[];
  onRefresh: () => void;
  isFullView?: boolean;
}

interface ParticipantCardProps {
  participant: ParticipantWithUser;
  onMessage?: (participant: ParticipantWithUser) => void;
  onCall?: (participant: ParticipantWithUser) => void;
  onViewDetails?: (participant: ParticipantWithUser) => void;
}

const ParticipantCard = React.memo(function ParticipantCard({
  participant,
  onMessage,
  onCall,
  onViewDetails
}: ParticipantCardProps) {
  const roleConfig = ROLE_CONFIG[participant.role];
  const attendanceConfig = ATTENDANCE_STATUS_CONFIG[participant.attendanceStatus];
  const presenceConfig = participant.presence ? PRESENCE_CONFIG[participant.presence] : null;
  const RoleIcon = roleConfig.icon;
  const AttendanceIcon = attendanceConfig.icon;
  const PresenceIcon = presenceConfig?.icon;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatCheckInTime = (time?: string) => {
    if (!time) return null;
    return new Date(time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-lg transition-all duration-200 group">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar with presence indicator */}
            <div className="relative flex-shrink-0">
              {participant.user.avatarUrl ? (
                <img
                  src={participant.user.avatarUrl}
                  alt={participant.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {getInitials(participant.user.name)}
                </div>
              )}
              
              {/* Presence indicator */}
              {presenceConfig && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                  presenceConfig.color
                )} />
              )}

              {/* Conflict of interest warning */}
              {participant.hasConflictOfInterest && (
                <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                  <AlertTriangle className="h-2 w-2 text-white" />
                </div>
              )}
            </div>

            {/* Participant info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {participant.user.name}
                </h3>
                <Badge className={cn("text-xs", roleConfig.color)}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleConfig.label}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 truncate mb-2">
                {participant.user.title}
              </p>

              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("text-xs", attendanceConfig.color)}>
                  <AttendanceIcon className="h-3 w-3 mr-1" />
                  {attendanceConfig.label}
                </Badge>

                {presenceConfig && (
                  <Badge variant="outline" className={cn("text-xs", presenceConfig.textColor)}>
                    <PresenceIcon className="h-3 w-3 mr-1" />
                    {presenceConfig.label}
                  </Badge>
                )}

                {participant.isVotingEligible && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Voting Eligible
                  </Badge>
                )}
              </div>

              {/* Additional info */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {formatCheckInTime(participant.checkInTime) && (
                  <span>Checked in: {formatCheckInTime(participant.checkInTime)}</span>
                )}
                {participant.delegateUserId && (
                  <span>Has delegate</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                {onMessage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMessage(participant)}
                    className="h-8 w-8 p-0"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                
                {onCall && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCall(participant)}
                    className="h-8 w-8 p-0"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewDetails?.(participant)}
                  className="h-8 w-8 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Conflict description */}
          {participant.hasConflictOfInterest && participant.conflictDescription && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <strong>Conflict of Interest:</strong> {participant.conflictDescription}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

export const ParticipantsPanel = React.memo(function ParticipantsPanel({
  participants,
  onRefresh,
  isFullView = false
}: ParticipantsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<string>('all');
  const [presenceFilter, setPresenceFilter] = useState<string>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithUser | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = participants.length;
    const present = participants.filter(p => p.presence === 'present' || p.presence === 'virtual').length;
    const accepted = participants.filter(p => p.attendanceStatus === 'accepted').length;
    const votingEligible = participants.filter(p => p.isVotingEligible).length;
    const conflicts = participants.filter(p => p.hasConflictOfInterest).length;

    return {
      total,
      present,
      accepted,
      votingEligible,
      conflicts,
      attendanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      presenceRate: total > 0 ? Math.round((present / total) * 100) : 0
    };
  }, [participants]);

  // Filtered and sorted participants
  const filteredParticipants = useMemo(() => {
    return participants
      .filter(participant => {
        const matchesSearch = participant.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            participant.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (participant.user.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        
        const matchesRole = roleFilter === 'all' || participant.role === roleFilter;
        const matchesAttendance = attendanceFilter === 'all' || participant.attendanceStatus === attendanceFilter;
        const matchesPresence = presenceFilter === 'all' || participant.presence === presenceFilter;

        return matchesSearch && matchesRole && matchesAttendance && matchesPresence;
      })
      .sort((a, b) => {
        // Sort by role priority first, then by name
        const roleA = ROLE_CONFIG[a.role]?.priority || 999;
        const roleB = ROLE_CONFIG[b.role]?.priority || 999;
        if (roleA !== roleB) return roleA - roleB;
        return a.user.name.localeCompare(b.user.name);
      });
  }, [participants, searchTerm, roleFilter, attendanceFilter, presenceFilter]);

  // Group participants by role for overview
  const participantsByRole = useMemo(() => {
    const groups: Record<string, ParticipantWithUser[]> = {};
    filteredParticipants.forEach(participant => {
      if (!groups[participant.role]) {
        groups[participant.role] = [];
      }
      groups[participant.role].push(participant);
    });
    return groups;
  }, [filteredParticipants]);

  const handleMessage = useCallback((participant: ParticipantWithUser) => {
    // Implementation would open messaging interface
    console.log('Message participant:', participant.user.name);
  }, []);

  const handleCall = useCallback((participant: ParticipantWithUser) => {
    // Implementation would initiate call
    console.log('Call participant:', participant.user.name);
  }, []);

  const handleViewDetails = useCallback((participant: ParticipantWithUser) => {
    setSelectedParticipant(participant);
  }, []);

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({stats.total})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.present}</div>
            <div className="text-xs text-blue-600">Present</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <div className="text-xs text-green-600">Accepted</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.votingEligible}</div>
            <div className="text-xs text-purple-600">Voting Eligible</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.presenceRate}%</div>
            <div className="text-xs text-orange-600">Attendance Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isFullView && (
            <div className="flex flex-wrap gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Roles</option>
                {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                {Object.entries(ATTENDANCE_STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              <select
                value={presenceFilter}
                onChange={(e) => setPresenceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Presence</option>
                {Object.entries(PRESENCE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Participants List */}
        {isFullView ? (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="roles">By Role</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredParticipants.map(participant => (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      onMessage={handleMessage}
                      onCall={handleCall}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-4">
              <div className="space-y-6">
                {Object.entries(participantsByRole).map(([role, roleParticipants]) => {
                  const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                  const RoleIcon = roleConfig.icon;
                  
                  return (
                    <div key={role}>
                      <div className="flex items-center gap-2 mb-3">
                        <RoleIcon className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">{roleConfig.label}</h3>
                        <Badge variant="outline" className="text-xs">
                          {roleParticipants.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {roleParticipants.map(participant => (
                          <ParticipantCard
                            key={participant.id}
                            participant={participant}
                            onMessage={handleMessage}
                            onCall={handleCall}
                            onViewDetails={handleViewDetails}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredParticipants.slice(0, 10).map(participant => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  onMessage={handleMessage}
                  onCall={handleCall}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </AnimatePresence>
            {filteredParticipants.length > 10 && (
              <div className="text-center text-sm text-gray-500 py-2">
                and {filteredParticipants.length - 10} more participants...
              </div>
            )}
          </div>
        )}

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No participants found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});