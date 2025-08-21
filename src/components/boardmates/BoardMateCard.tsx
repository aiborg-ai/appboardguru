'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { BoardMateCardProps } from '@/types/boardmates';
import { Card, CardContent, CardHeader } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar';
import { 
  Mail,
  Phone,
  Linkedin,
  Building2,
  Crown,
  Shield,
  User,
  Edit,
  MessageSquare,
  Settings,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Users,
  FolderOpen,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types now imported from shared types file

// Role configurations
const BOARD_ROLE_CONFIG = {
  chairman: { label: 'Chairman', icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  vice_chairman: { label: 'Vice Chairman', icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  ceo: { label: 'CEO', icon: Crown, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  cfo: { label: 'CFO', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-100' },
  cto: { label: 'CTO', icon: Shield, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  independent_director: { label: 'Independent Director', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  executive_director: { label: 'Executive Director', icon: User, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  non_executive_director: { label: 'Non-Executive Director', icon: User, color: 'text-zinc-600', bgColor: 'bg-zinc-100' },
  board_member: { label: 'Board Member', icon: User, color: 'text-neutral-600', bgColor: 'bg-neutral-100' },
  board_observer: { label: 'Board Observer', icon: User, color: 'text-stone-600', bgColor: 'bg-stone-100' }
};

const COMMITTEE_ROLE_CONFIG = {
  chair: { label: 'Chair', icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  vice_chair: { label: 'Vice Chair', icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  member: { label: 'Member', icon: User, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  secretary: { label: 'Secretary', icon: Edit, color: 'text-green-600', bgColor: 'bg-green-100' },
  advisor: { label: 'Advisor', icon: User, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  observer: { label: 'Observer', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-100' }
};

const VAULT_ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  admin: { label: 'Admin', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100' },
  moderator: { label: 'Moderator', icon: Shield, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  contributor: { label: 'Contributor', icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  viewer: { label: 'Viewer', icon: User, color: 'text-gray-600', bgColor: 'bg-gray-100' }
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

const COMMITTEE_TYPE_LABELS = {
  audit: 'Audit',
  compensation: 'Compensation',
  governance: 'Governance',
  risk: 'Risk Management',
  nomination: 'Nomination',
  strategy: 'Strategy',
  technology: 'Technology',
  investment: 'Investment',
  ethics: 'Ethics',
  executive: 'Executive',
  other: 'Other'
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const formatLastActive = (dateString: string | undefined) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(dateString);
};

export default function BoardMateCard({ 
  boardmate, 
  onEdit, 
  onMessage, 
  onManageAssociations,
  className 
}: BoardMateCardProps) {
  const statusConfig = STATUS_CONFIG[boardmate.org_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  // Get primary board role (highest priority)
  const primaryBoardRole = boardmate.board_memberships
    .filter(bm => bm.member_status === 'active')
    .sort((a, b) => {
      const roleOrder = ['chairman', 'vice_chairman', 'ceo', 'cfo', 'cto', 'independent_director', 'executive_director', 'non_executive_director', 'board_member', 'board_observer'];
      return roleOrder.indexOf(a.member_role) - roleOrder.indexOf(b.member_role);
    })[0];

  const displayDesignation = boardmate.designation || primaryBoardRole?.member_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || boardmate.position;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={className}
    >
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="w-12 h-12">
                <AvatarImage src={boardmate.avatar_url} alt={boardmate.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {boardmate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {boardmate.full_name}
                </h3>
                {displayDesignation && (
                  <p className="text-sm font-medium text-gray-600 truncate">
                    {displayDesignation}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={cn("text-xs", statusConfig.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(boardmate)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onMessage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMessage(boardmate)}
                  className="h-8 w-8 p-0"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
              {onManageAssociations && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onManageAssociations(boardmate)}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Contact Information */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span className="truncate">{boardmate.email}</span>
            </div>
            
            {boardmate.company && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{boardmate.company}</span>
              </div>
            )}
            
            {boardmate.linkedin_url && (
              <div className="flex items-center space-x-2">
                <Linkedin className="h-4 w-4 text-blue-600" />
                <Link 
                  href={boardmate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                >
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Board Memberships */}
          {boardmate.board_memberships.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Board Roles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {boardmate.board_memberships
                  .filter(bm => bm.member_status === 'active')
                  .slice(0, 3)
                  .map((membership) => {
                    const roleConfig = BOARD_ROLE_CONFIG[membership.member_role];
                    const RoleIcon = roleConfig.icon;
                    return (
                      <div
                        key={membership.board_id}
                        className={cn(
                          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                          roleConfig.bgColor
                        )}
                      >
                        <RoleIcon className={cn("w-3 h-3", roleConfig.color)} />
                        <span className={roleConfig.color}>
                          {roleConfig.label}
                        </span>
                        <span className="text-gray-500">
                          • {membership.board_name}
                        </span>
                      </div>
                    );
                  })}
                {boardmate.board_memberships.filter(bm => bm.member_status === 'active').length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{boardmate.board_memberships.filter(bm => bm.member_status === 'active').length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Committee Memberships */}
          {boardmate.committee_memberships.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Committee Roles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {boardmate.committee_memberships
                  .filter(cm => cm.member_status === 'active')
                  .slice(0, 2)
                  .map((membership) => {
                    const roleConfig = COMMITTEE_ROLE_CONFIG[membership.member_role];
                    const RoleIcon = roleConfig.icon;
                    return (
                      <div
                        key={membership.committee_id}
                        className={cn(
                          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                          roleConfig.bgColor
                        )}
                      >
                        <RoleIcon className={cn("w-3 h-3", roleConfig.color)} />
                        <span className={roleConfig.color}>
                          {roleConfig.label}
                        </span>
                        <span className="text-gray-500">
                          • {COMMITTEE_TYPE_LABELS[membership.committee_type]}
                        </span>
                      </div>
                    );
                  })}
                {boardmate.committee_memberships.filter(cm => cm.member_status === 'active').length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{boardmate.committee_memberships.filter(cm => cm.member_status === 'active').length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Vault Memberships */}
          {boardmate.vault_memberships.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <FolderOpen className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Vault Access</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {boardmate.vault_memberships
                  .filter(vm => vm.member_status === 'active')
                  .slice(0, 2)
                  .map((membership) => {
                    const roleConfig = VAULT_ROLE_CONFIG[membership.member_role];
                    const RoleIcon = roleConfig.icon;
                    return (
                      <div
                        key={membership.vault_id}
                        className={cn(
                          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                          roleConfig.bgColor
                        )}
                      >
                        <RoleIcon className={cn("w-3 h-3", roleConfig.color)} />
                        <span className={roleConfig.color}>
                          {roleConfig.label}
                        </span>
                        <span className="text-gray-500">
                          • {membership.vault_name}
                        </span>
                      </div>
                    );
                  })}
                {boardmate.vault_memberships.filter(vm => vm.member_status === 'active').length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{boardmate.vault_memberships.filter(vm => vm.member_status === 'active').length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Activity Information */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Joined {formatDate(boardmate.org_joined_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Last active {formatLastActive(boardmate.org_last_accessed)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}