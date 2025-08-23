/**
 * Virtual Board Room Cast Vote API
 * Handles individual vote casting with blockchain verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service-client';
import { BlockchainVotingService } from '@/lib/services/blockchain-voting.service';
import { BoardRoomSecurityService } from '@/lib/services/board-room-security.service';
import { z } from 'zod';

const supabase = createSupabaseServiceClient();
const votingService = new BlockchainVotingService();
const securityService = new BoardRoomSecurityService();

const CastVoteSchema = z.object({
  voteChoice: z.enum(['for', 'against', 'abstain']),
  voteWeight: z.number().min(0).max(10).default(1),
  proxyGrantorId: z.string().uuid().optional(),
  reasoning: z.string().max(1000).optional(),
  deviceFingerprint: z.string()
});

/**
 * POST /api/virtual-board-room/[sessionId]/voting/[voteId]/cast
 * Cast a vote on a motion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string; voteId: string } }
) {
  try {
    const { sessionId, voteId } = params;

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
    const validatedData = CastVoteSchema.parse(body);

    // Verify user is eligible voting participant
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });
    }

    if (!participant.voting_eligible) {
      return NextResponse.json({ error: 'Not eligible to vote in this session' }, { status: 403 });
    }

    // Verify vote exists and is active
    const { data: vote } = await supabase
      .from('board_room_votes')
      .select('*')
      .eq('id', voteId)
      .eq('session_id', sessionId)
      .single();

    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    }

    if (vote.status !== 'active') {
      return NextResponse.json({ error: 'Voting is not currently active' }, { status: 400 });
    }

    // Check if vote has expired
    if (vote.ends_at && new Date(vote.ends_at) < new Date()) {
      return NextResponse.json({ error: 'Voting period has ended' }, { status: 400 });
    }

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from('board_room_vote_records')
      .select('id')
      .eq('vote_id', voteId)
      .eq('voter_id', user.id)
      .single();

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted on this motion' }, { status: 400 });
    }

    // Verify device if required
    if (participant.device_trusted && participant.device_fingerprint !== validatedData.deviceFingerprint) {
      return NextResponse.json({ error: 'Device verification failed' }, { status: 403 });
    }

    // Validate proxy vote if applicable
    if (validatedData.proxyGrantorId) {
      const { data: proxyGrantor } = await supabase
        .from('board_room_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', validatedData.proxyGrantorId)
        .single();

      if (!proxyGrantor) {
        return NextResponse.json({ error: 'Proxy grantor not found in session' }, { status: 400 });
      }

      if (proxyGrantor.proxy_for !== user.id) {
        return NextResponse.json({ error: 'Invalid proxy authorization' }, { status: 403 });
      }

      // Check if proxy grantor has already voted
      const { data: proxyGrantorVote } = await supabase
        .from('board_room_vote_records')
        .select('id')
        .eq('vote_id', voteId)
        .eq('voter_id', validatedData.proxyGrantorId)
        .single();

      if (proxyGrantorVote) {
        return NextResponse.json({ error: 'Proxy grantor has already voted' }, { status: 400 });
      }
    }

    // Get client information for audit
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Cast the vote using blockchain voting service
    try {
      const blockchainVote = await votingService.castVote(
        voteId,
        user.id,
        validatedData.voteChoice,
        validatedData.voteWeight,
        validatedData.proxyGrantorId
      );

      // Update participant last activity
      await supabase
        .from('board_room_participants')
        .update({
          metadata: {
            ...participant.metadata,
            last_vote_cast: new Date().toISOString(),
            vote_count: (participant.metadata?.vote_count || 0) + 1
          }
        })
        .eq('id', participant.id);

      // Create detailed audit record
      await supabase
        .from('vote_audit_trail')
        .insert({
          id: crypto.randomUUID(),
          vote_id: voteId,
          voter_id: user.id,
          action: 'vote_cast',
          vote_choice: validatedData.voteChoice,
          vote_weight: validatedData.voteWeight,
          is_proxy_vote: !!validatedData.proxyGrantorId,
          proxy_grantor_id: validatedData.proxyGrantorId,
          device_fingerprint: validatedData.deviceFingerprint,
          ip_address: clientIP,
          user_agent: userAgent,
          blockchain_hash: blockchainVote.blockchainHash,
          transaction_id: blockchainVote.transactionId,
          reasoning: validatedData.reasoning,
          created_at: new Date().toISOString()
        });

      // Log security event
      await securityService.logSecurityEvent({
        sessionId,
        userId: user.id,
        eventType: 'vote_cast',
        eventCategory: 'data_access',
        severityLevel: 'info',
        description: `Vote cast: ${validatedData.voteChoice}`,
        sourceIP: clientIP,
        userAgent,
        deviceFingerprint: validatedData.deviceFingerprint,
        eventData: {
          voteId,
          voteChoice: validatedData.voteChoice,
          voteWeight: validatedData.voteWeight,
          isProxyVote: !!validatedData.proxyGrantorId,
          blockchainHash: blockchainVote.blockchainHash
        },
        riskScore: 0
      });

      // Check if this vote triggers motion completion
      const { data: updatedVote } = await supabase
        .from('board_room_votes')
        .select('votes_for, votes_against, abstentions, required_votes, status')
        .eq('id', voteId)
        .single();

      let motionCompleted = false;
      if (updatedVote) {
        const totalVotes = (updatedVote.votes_for || 0) + 
                          (updatedVote.votes_against || 0) + 
                          (updatedVote.abstentions || 0);
        
        if (totalVotes >= updatedVote.required_votes) {
          motionCompleted = true;
        }
      }

      // Send real-time update to other participants
      // This would be handled by WebSocket in production
      
      const response = {
        success: true,
        blockchainVote: {
          voteId: blockchainVote.voteId,
          timestamp: blockchainVote.timestamp,
          blockchainHash: blockchainVote.blockchainHash,
          transactionId: blockchainVote.transactionId,
          verified: true
        },
        voteStatus: {
          votesFor: updatedVote?.votes_for || 0,
          votesAgainst: updatedVote?.votes_against || 0,
          abstentions: updatedVote?.abstentions || 0,
          totalVotes: (updatedVote?.votes_for || 0) + 
                     (updatedVote?.votes_against || 0) + 
                     (updatedVote?.abstentions || 0),
          requiredVotes: updatedVote?.required_votes || vote.required_votes,
          completed: motionCompleted
        },
        message: 'Vote cast successfully'
      };

      return NextResponse.json(response, { status: 201 });

    } catch (votingError: any) {
      console.error('Voting error:', votingError);
      
      // Log failed vote attempt
      await securityService.logSecurityEvent({
        sessionId,
        userId: user.id,
        eventType: 'vote_cast_failed',
        eventCategory: 'data_access',
        severityLevel: 'warning',
        description: `Vote casting failed: ${votingError.message}`,
        sourceIP: clientIP,
        userAgent,
        deviceFingerprint: validatedData.deviceFingerprint,
        eventData: {
          voteId,
          voteChoice: validatedData.voteChoice,
          error: votingError.message
        },
        riskScore: 25
      });

      return NextResponse.json({ 
        error: 'Failed to cast vote',
        details: votingError.message 
      }, { status: 500 });
    }

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
 * GET /api/virtual-board-room/[sessionId]/voting/[voteId]/cast
 * Get vote casting status and user's vote if available
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; voteId: string } }
) {
  try {
    const { sessionId, voteId } = params;

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

    // Verify user participation
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('voting_eligible, participant_role')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });
    }

    // Get vote details
    const { data: vote } = await supabase
      .from('board_room_votes')
      .select('*')
      .eq('id', voteId)
      .eq('session_id', sessionId)
      .single();

    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    }

    // Check user's vote record
    const { data: userVoteRecord } = await supabase
      .from('board_room_vote_records')
      .select('*')
      .eq('vote_id', voteId)
      .eq('voter_id', user.id)
      .single();

    // Get proxy votes cast by user
    const { data: proxyVotes } = await supabase
      .from('board_room_vote_records')
      .select('*')
      .eq('vote_id', voteId)
      .eq('proxy_grantor_id', user.id);

    const response = {
      vote: {
        id: vote.id,
        motionTitle: vote.motion_title,
        motionDescription: vote.motion_description,
        voteType: vote.vote_type,
        status: vote.status,
        isAnonymous: vote.is_anonymous,
        endsAt: vote.ends_at,
        votesFor: vote.votes_for || 0,
        votesAgainst: vote.votes_against || 0,
        abstentions: vote.abstentions || 0,
        requiredVotes: vote.required_votes,
        quorumRequired: vote.quorum_required,
        quorumMet: vote.quorum_met
      },
      userStatus: {
        canVote: participant.voting_eligible && vote.status === 'active',
        hasVoted: !!userVoteRecord,
        votingEligible: participant.voting_eligible,
        isAnonymousVote: vote.is_anonymous
      },
      userVote: userVoteRecord && !vote.is_anonymous ? {
        choice: userVoteRecord.vote_choice,
        weight: userVoteRecord.vote_weight,
        castAt: userVoteRecord.cast_at,
        blockchainHash: userVoteRecord.blockchain_hash,
        isProxyVote: userVoteRecord.is_proxy_vote
      } : null,
      proxyVotes: proxyVotes?.map(pv => ({
        id: pv.id,
        choice: pv.vote_choice,
        weight: pv.vote_weight,
        castAt: pv.cast_at,
        voterUserId: pv.voter_id
      })) || []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}