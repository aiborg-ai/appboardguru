/**
 * Virtual Board Room Voting API
 * Handles blockchain-verified voting within board room sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BlockchainVotingService } from '@/lib/services/blockchain-voting.service';
import { BoardRoomSecurityService } from '@/lib/services/board-room-security.service';
import { z } from 'zod';

const supabase = supabaseAdmin;
const votingService = new BlockchainVotingService();
const securityService = new BoardRoomSecurityService();

const CreateVoteSchema = z.object({
  motionTitle: z.string().min(1).max(500),
  motionDescription: z.string().optional(),
  voteType: z.enum(['simple_majority', 'two_thirds_majority', 'unanimous', 'special_resolution']),
  isAnonymous: z.boolean().default(false),
  blockchainEnabled: z.boolean().default(true),
  requiredVotes: z.number().min(1),
  quorumRequired: z.number().min(1),
  endsAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).default({})
});

const CastVoteSchema = z.object({
  voteChoice: z.enum(['for', 'against', 'abstain']),
  voteWeight: z.number().min(0).max(10).default(1),
  proxyGrantorId: z.string().uuid().optional(),
  reasoning: z.string().optional()
});

/**
 * GET /api/virtual-board-room/[sessionId]/voting
 * Get all votes for a board room session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeResults = searchParams.get('includeResults') === 'true';

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user is participant in session
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, voting_eligible')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });
    }

    // Get votes
    let query = supabase
      .from('board_room_votes')
      .select(`
        *,
        vote_records:board_room_vote_records(
          id,
          voter_id,
          vote_choice,
          vote_weight,
          is_proxy_vote,
          proxy_grantor_id,
          cast_at,
          blockchain_hash
        )
      `)
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: votes, error: votesError } = await query;

    if (votesError) {
      console.error('Votes query error:', votesError);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    // Process votes for response
    const processedVotes = await Promise.all((votes || []).map(async (vote) => {
      const voteData = {
        id: vote.id,
        motionTitle: vote.motion_title,
        motionDescription: vote.motion_description,
        voteType: vote.vote_type,
        isAnonymous: vote.is_anonymous,
        blockchainEnabled: vote.blockchain_enabled,
        startedBy: vote.started_by,
        startedAt: vote.started_at,
        endsAt: vote.ends_at,
        endedAt: vote.ended_at,
        status: vote.status,
        requiredVotes: vote.required_votes,
        quorumRequired: vote.quorum_required,
        quorumMet: vote.quorum_met,
        result: vote.result,
        votesFor: vote.votes_for || 0,
        votesAgainst: vote.votes_against || 0,
        abstentions: vote.abstentions || 0,
        totalVotes: (vote.votes_for || 0) + (vote.votes_against || 0) + (vote.abstentions || 0),
        blockchainHash: vote.blockchain_hash,
        blockchainTransactionId: vote.blockchain_transaction_id,
        metadata: vote.metadata || {}
      };

      // Include user's vote if they have voted
      const userVote = vote.vote_records?.find((record: any) => record.voter_id === user.id);
      if (userVote && !vote.is_anonymous) {
        (voteData as any).userVote = {
          choice: userVote.vote_choice,
          weight: userVote.vote_weight,
          castAt: userVote.cast_at,
          blockchainHash: userVote.blockchain_hash
        };
      } else if (userVote && vote.is_anonymous) {
        (voteData as any).userHasVoted = true;
      }

      // Include detailed results if requested and user has permission
      if (includeResults && ['host', 'co_host', 'director'].includes(participant.participant_role)) {
        if (!vote.is_anonymous) {
          (voteData as any).voteRecords = vote.vote_records?.map((record: any) => ({
            id: record.id,
            voterId: record.voter_id,
            voteChoice: record.vote_choice,
            voteWeight: record.vote_weight,
            isProxyVote: record.is_proxy_vote,
            proxyGrantorId: record.proxy_grantor_id,
            castAt: record.cast_at,
            blockchainHash: record.blockchain_hash
          }));
        }

        // Get blockchain verification status
        if (vote.blockchain_enabled) {
          try {
            const verificationResults = await votingService.getVotingResults(vote.id);
            (voteData as any).blockchainVerified = verificationResults.blockchainVerified;
            (voteData as any).auditTrail = verificationResults.auditTrail;
          } catch (error) {
            console.error('Blockchain verification error:', error);
            (voteData as any).blockchainVerified = false;
          }
        }
      }

      return voteData;
    }));

    return NextResponse.json({
      votes: processedVotes,
      userPermissions: {
        canCreateVote: ['host', 'co_host', 'director'].includes(participant.participant_role),
        canVote: participant.voting_eligible,
        canViewResults: ['host', 'co_host', 'director'].includes(participant.participant_role)
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/virtual-board-room/[sessionId]/voting
 * Create a new voting motion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateVoteSchema.parse(body);

    // Verify user permissions
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, voting_eligible')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant || !['host', 'co_host', 'director'].includes(participant.participant_role)) {
      return NextResponse.json({ error: 'Insufficient permissions to create vote' }, { status: 403 });
    }

    // Verify session is active
    const { data: session } = await supabase
      .from('board_room_sessions')
      .select('status, session_type')
      .eq('id', sessionId)
      .single();

    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Session must be active to create votes' }, { status: 400 });
    }

    // Create voting motion
    const votingMotion = await votingService.createVotingMotion(sessionId, {
      title: validatedData.motionTitle,
      description: validatedData.motionDescription,
      type: validatedData.voteType,
      isAnonymous: validatedData.isAnonymous,
      blockchainEnabled: validatedData.blockchainEnabled,
      startedBy: user.id,
      requiredVotes: validatedData.requiredVotes,
      quorumRequired: validatedData.quorumRequired,
      endTime: validatedData.endsAt ? new Date(validatedData.endsAt) : undefined,
      metadata: validatedData.metadata
    });

    // Log vote creation
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'vote_created',
      eventCategory: 'data_access',
      severityLevel: 'info',
      description: `Voting motion created: ${validatedData.motionTitle}`,
      eventData: {
        motionId: votingMotion.id,
        voteType: validatedData.voteType,
        isAnonymous: validatedData.isAnonymous,
        blockchainEnabled: validatedData.blockchainEnabled
      },
      riskScore: 5
    });

    return NextResponse.json({
      vote: votingMotion,
      message: 'Voting motion created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/virtual-board-room/[sessionId]/voting/[voteId]
 * Start or end a voting motion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string; voteId: string } }
) {
  try {
    const { sessionId, voteId } = params;
    const body = await request.json();
    const { action } = body; // 'start' or 'end'

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify permissions
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant || !['host', 'co_host'].includes(participant.participant_role)) {
      return NextResponse.json({ error: 'Only hosts can control voting' }, { status: 403 });
    }

    let result;

    if (action === 'start') {
      result = await votingService.startVotingMotion(voteId);
      
      await securityService.logSecurityEvent({
        sessionId,
        userId: user.id,
        eventType: 'vote_started',
        eventCategory: 'data_access',
        severityLevel: 'info',
        description: 'Voting motion started',
        eventData: { voteId },
        riskScore: 0
      });
    } else if (action === 'end') {
      result = await votingService.endVotingMotion(voteId, user.id);
      
      await securityService.logSecurityEvent({
        sessionId,
        userId: user.id,
        eventType: 'vote_ended',
        eventCategory: 'data_access',
        severityLevel: 'info',
        description: 'Voting motion ended',
        eventData: { voteId, results: result },
        riskScore: 0
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Vote ${action}ed successfully`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}