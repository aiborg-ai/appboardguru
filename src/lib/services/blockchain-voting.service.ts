/**
 * Blockchain-Verified Digital Voting Service
 * Immutable and auditable voting system for board room decisions
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service-client';
import { Database } from '@/types/database';
import crypto from 'crypto';

type SupabaseClient = ReturnType<typeof createSupabaseServiceClient>;

export interface BlockchainVote {
  voteId: string;
  sessionId: string;
  motionTitle: string;
  voterId: string;
  voteChoice: 'for' | 'against' | 'abstain';
  voteWeight: number;
  timestamp: Date;
  blockchainHash: string;
  transactionId: string;
  signature: string;
  merkleProof: string[];
}

export interface VotingMotion {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  type: 'simple_majority' | 'two_thirds_majority' | 'unanimous' | 'special_resolution';
  isAnonymous: boolean;
  blockchainEnabled: boolean;
  startedBy: string;
  startTime: Date;
  endTime?: Date;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  requiredVotes: number;
  quorumRequired: number;
  results?: VotingResults;
}

export interface VotingResults {
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  totalVotes: number;
  quorumMet: boolean;
  result: 'passed' | 'failed' | 'no_quorum' | 'cancelled';
  participationRate: number;
  blockchainVerified: boolean;
}

export interface ProxyVoting {
  grantorId: string;
  proxyId: string;
  sessionId: string;
  scope: 'full_session' | 'specific_motion' | 'motion_category';
  restrictions: string[];
  expiresAt: Date;
  isActive: boolean;
}

export interface VoteAuditTrail {
  voteId: string;
  eventType: string;
  eventData: any;
  timestamp: Date;
  blockchainHash: string;
  verified: boolean;
}

export class BlockchainVotingService {
  private supabase: SupabaseClient;
  private blockchainNetwork: string;
  private contractAddress: string;
  private privateKey: string;
  private merkleTree: Map<string, string[]> = new Map();

  constructor() {
    this.supabase = createSupabaseServiceClient();
    this.blockchainNetwork = process.env.BLOCKCHAIN_NETWORK || 'ethereum';
    this.contractAddress = process.env.VOTING_CONTRACT_ADDRESS || '';
    this.privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || '';
  }

  /**
   * Create a new voting motion
   */
  async createVotingMotion(
    sessionId: string,
    motion: Omit<VotingMotion, 'id' | 'status' | 'startTime'>
  ): Promise<VotingMotion> {
    const motionId = crypto.randomUUID();
    
    // Generate blockchain hash for motion
    const blockchainHash = await this.generateMotionHash(motionId, motion);
    
    const newMotion: VotingMotion = {
      id: motionId,
      status: 'draft',
      startTime: new Date(),
      ...motion,
      sessionId
    };

    // Store motion in database
    const { data, error } = await this.supabase
      .from('board_room_votes')
      .insert({
        id: motionId,
        session_id: sessionId,
        motion_title: motion.title,
        motion_description: motion.description,
        vote_type: motion.type,
        is_anonymous: motion.isAnonymous,
        blockchain_enabled: motion.blockchainEnabled,
        started_by: motion.startedBy,
        required_votes: motion.requiredVotes,
        quorum_required: motion.quorumRequired,
        blockchain_hash: blockchainHash,
        status: 'draft',
        audit_trail: [{
          event: 'motion_created',
          timestamp: new Date().toISOString(),
          blockchain_hash: blockchainHash,
          data: { motion }
        }]
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create voting motion: ${error.message}`);
    }

    // Initialize blockchain record if enabled
    if (motion.blockchainEnabled) {
      await this.initializeBlockchainVote(motionId, blockchainHash);
    }

    return newMotion;
  }

  /**
   * Start a voting motion
   */
  async startVotingMotion(motionId: string): Promise<VotingMotion> {
    const { data: motion, error } = await this.supabase
      .from('board_room_votes')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', motionId)
      .select()
      .single();

    if (error || !motion) {
      throw new Error(`Failed to start voting motion: ${error?.message}`);
    }

    // Create blockchain transaction for vote start
    if (motion.blockchain_enabled) {
      const transactionId = await this.recordBlockchainEvent(motionId, 'vote_started', {
        motion_id: motionId,
        started_at: motion.started_at
      });

      await this.supabase
        .from('board_room_votes')
        .update({
          blockchain_transaction_id: transactionId
        })
        .eq('id', motionId);
    }

    return this.mapDatabaseToMotion(motion);
  }

  /**
   * Cast a vote with blockchain verification
   */
  async castVote(
    voteId: string,
    voterId: string,
    voteChoice: 'for' | 'against' | 'abstain',
    voteWeight: number = 1.0,
    proxyGrantorId?: string
  ): Promise<BlockchainVote> {
    // Validate voting eligibility
    await this.validateVoterEligibility(voteId, voterId);

    // Check for existing vote
    const { data: existingVote } = await this.supabase
      .from('board_room_vote_records')
      .select('id')
      .eq('vote_id', voteId)
      .eq('voter_id', voterId)
      .single();

    if (existingVote) {
      throw new Error('Vote already cast by this user');
    }

    // Get motion details
    const { data: motion } = await this.supabase
      .from('board_room_votes')
      .select('*')
      .eq('id', voteId)
      .single();

    if (!motion || motion.status !== 'active') {
      throw new Error('Motion is not active for voting');
    }

    // Generate vote signature and hash
    const voteData = {
      voteId,
      voterId,
      voteChoice,
      voteWeight,
      timestamp: new Date(),
      proxyGrantorId
    };

    const voteSignature = await this.signVote(voteData);
    const blockchainHash = await this.generateVoteHash(voteData);

    // Create blockchain transaction
    let transactionId = '';
    let merkleProof: string[] = [];

    if (motion.blockchain_enabled) {
      transactionId = await this.recordBlockchainVote(blockchainHash, voteData);
      merkleProof = await this.generateMerkleProof(voteId, blockchainHash);
    }

    // Store vote record
    const { data: voteRecord, error } = await this.supabase
      .from('board_room_vote_records')
      .insert({
        vote_id: voteId,
        voter_id: voterId,
        vote_choice: voteChoice,
        vote_weight: voteWeight,
        is_proxy_vote: !!proxyGrantorId,
        proxy_grantor_id: proxyGrantorId,
        blockchain_hash: blockchainHash,
        vote_signature: voteSignature,
        cast_at: new Date().toISOString(),
        audit_trail: [{
          event: 'vote_cast',
          timestamp: new Date().toISOString(),
          blockchain_hash: blockchainHash,
          transaction_id: transactionId
        }]
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cast vote: ${error.message}`);
    }

    // Update motion statistics
    await this.updateMotionStats(voteId);

    // Check if voting should auto-complete
    await this.checkVotingCompletion(voteId);

    const blockchainVote: BlockchainVote = {
      voteId: voteRecord.id,
      sessionId: motion.session_id,
      motionTitle: motion.motion_title,
      voterId,
      voteChoice,
      voteWeight,
      timestamp: new Date(voteRecord.cast_at),
      blockchainHash,
      transactionId,
      signature: voteSignature,
      merkleProof
    };

    return blockchainVote;
  }

  /**
   * End a voting motion
   */
  async endVotingMotion(motionId: string, endedBy: string): Promise<VotingResults> {
    // Get current vote counts
    const { data: voteStats } = await this.supabase
      .rpc('get_vote_statistics', { motion_id: motionId });

    if (!voteStats) {
      throw new Error('Failed to get vote statistics');
    }

    const results: VotingResults = {
      votesFor: voteStats.votes_for || 0,
      votesAgainst: voteStats.votes_against || 0,
      abstentions: voteStats.abstentions || 0,
      totalVotes: voteStats.total_votes || 0,
      quorumMet: voteStats.quorum_met || false,
      result: this.calculateVoteResult(voteStats),
      participationRate: voteStats.participation_rate || 0,
      blockchainVerified: await this.verifyBlockchainVotes(motionId)
    };

    // Update motion with final results
    const { error } = await this.supabase
      .from('board_room_votes')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        result: results.result,
        quorum_met: results.quorumMet,
        votes_for: results.votesFor,
        votes_against: results.votesAgainst,
        abstentions: results.abstentions
      })
      .eq('id', motionId);

    if (error) {
      throw new Error(`Failed to end voting motion: ${error.message}`);
    }

    // Record final blockchain transaction
    const motion = await this.getMotion(motionId);
    if (motion?.blockchainEnabled) {
      await this.recordBlockchainEvent(motionId, 'vote_ended', {
        results,
        ended_by: endedBy,
        ended_at: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Verify vote integrity on blockchain
   */
  async verifyVoteIntegrity(voteId: string): Promise<boolean> {
    const { data: voteRecord } = await this.supabase
      .from('board_room_vote_records')
      .select('*')
      .eq('id', voteId)
      .single();

    if (!voteRecord) {
      return false;
    }

    // Verify blockchain hash
    const expectedHash = await this.generateVoteHash({
      voteId: voteRecord.vote_id,
      voterId: voteRecord.voter_id,
      voteChoice: voteRecord.vote_choice,
      voteWeight: voteRecord.vote_weight,
      timestamp: new Date(voteRecord.cast_at),
      proxyGrantorId: voteRecord.proxy_grantor_id
    });

    if (expectedHash !== voteRecord.blockchain_hash) {
      return false;
    }

    // Verify signature
    const voteData = {
      voteId: voteRecord.vote_id,
      voterId: voteRecord.voter_id,
      voteChoice: voteRecord.vote_choice,
      voteWeight: voteRecord.vote_weight,
      timestamp: new Date(voteRecord.cast_at),
      proxyGrantorId: voteRecord.proxy_grantor_id
    };

    return await this.verifyVoteSignature(voteData, voteRecord.vote_signature);
  }

  /**
   * Get voting results with blockchain verification
   */
  async getVotingResults(motionId: string): Promise<VotingResults & { auditTrail: VoteAuditTrail[] }> {
    const { data: motion } = await this.supabase
      .from('board_room_votes')
      .select('*')
      .eq('id', motionId)
      .single();

    if (!motion) {
      throw new Error('Motion not found');
    }

    const results: VotingResults = {
      votesFor: motion.votes_for || 0,
      votesAgainst: motion.votes_against || 0,
      abstentions: motion.abstentions || 0,
      totalVotes: (motion.votes_for || 0) + (motion.votes_against || 0) + (motion.abstentions || 0),
      quorumMet: motion.quorum_met || false,
      result: motion.result || 'active',
      participationRate: this.calculateParticipationRate(motion),
      blockchainVerified: await this.verifyBlockchainVotes(motionId)
    };

    // Get audit trail
    const auditTrail = await this.getVoteAuditTrail(motionId);

    return {
      ...results,
      auditTrail
    };
  }

  /**
   * Set up proxy voting
   */
  async setupProxyVoting(
    grantorId: string,
    proxyId: string,
    sessionId: string,
    scope: ProxyVoting['scope'],
    restrictions: string[] = [],
    expiresAt: Date
  ): Promise<ProxyVoting> {
    const proxy: ProxyVoting = {
      grantorId,
      proxyId,
      sessionId,
      scope,
      restrictions,
      expiresAt,
      isActive: true
    };

    // Store proxy arrangement
    await this.supabase
      .from('board_room_participants')
      .update({
        proxy_for: grantorId
      })
      .eq('session_id', sessionId)
      .eq('user_id', proxyId);

    return proxy;
  }

  /**
   * Generate anonymous voting tokens
   */
  async generateAnonymousVotingTokens(motionId: string): Promise<Map<string, string>> {
    const { data: eligibleVoters } = await this.supabase
      .from('board_room_participants')
      .select('user_id')
      .eq('session_id', (await this.getMotion(motionId))?.sessionId)
      .eq('voting_eligible', true);

    const tokens = new Map<string, string>();

    if (eligibleVoters) {
      for (const voter of eligibleVoters) {
        const anonymousToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(anonymousToken).digest('hex');
        
        // Store mapping securely (in production, use encrypted storage)
        tokens.set(voter.user_id, anonymousToken);
        
        // Store hashed token for verification
        await this.supabase
          .from('anonymous_voting_tokens')
          .insert({
            motion_id: motionId,
            user_id: voter.user_id,
            token_hash: hashedToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          });
      }
    }

    return tokens;
  }

  /**
   * Validate voter eligibility
   */
  private async validateVoterEligibility(voteId: string, voterId: string): Promise<void> {
    const { data: motion } = await this.supabase
      .from('board_room_votes')
      .select('session_id')
      .eq('id', voteId)
      .single();

    if (!motion) {
      throw new Error('Motion not found');
    }

    const { data: participant } = await this.supabase
      .from('board_room_participants')
      .select('voting_eligible')
      .eq('session_id', motion.session_id)
      .eq('user_id', voterId)
      .single();

    if (!participant || !participant.voting_eligible) {
      throw new Error('User is not eligible to vote');
    }
  }

  /**
   * Generate cryptographic hash for vote
   */
  private async generateVoteHash(voteData: any): Promise<string> {
    const voteString = JSON.stringify(voteData, Object.keys(voteData).sort());
    return crypto.createHash('sha256').update(voteString).digest('hex');
  }

  /**
   * Generate cryptographic hash for motion
   */
  private async generateMotionHash(motionId: string, motion: any): Promise<string> {
    const motionString = JSON.stringify({ motionId, ...motion }, Object.keys({ motionId, ...motion }).sort());
    return crypto.createHash('sha256').update(motionString).digest('hex');
  }

  /**
   * Sign vote with private key
   */
  private async signVote(voteData: any): Promise<string> {
    const voteHash = await this.generateVoteHash(voteData);
    const signature = crypto.createSign('SHA256');
    signature.update(voteHash);
    return signature.sign(this.privateKey, 'hex');
  }

  /**
   * Verify vote signature
   */
  private async verifyVoteSignature(voteData: any, signature: string): Promise<boolean> {
    try {
      const voteHash = await this.generateVoteHash(voteData);
      const verifier = crypto.createVerify('SHA256');
      verifier.update(voteHash);
      
      // In production, use public key from certificate
      const publicKey = this.getPublicKeyFromPrivate(this.privateKey);
      return verifier.verify(publicKey, signature, 'hex');
    } catch {
      return false;
    }
  }

  /**
   * Record vote on blockchain (mock implementation)
   */
  private async recordBlockchainVote(voteHash: string, voteData: any): Promise<string> {
    // In production, this would interact with actual blockchain
    const transactionData = {
      hash: voteHash,
      data: voteData,
      timestamp: new Date().toISOString(),
      network: this.blockchainNetwork,
      contract: this.contractAddress
    };

    // Mock transaction ID
    const transactionId = crypto.createHash('sha256')
      .update(JSON.stringify(transactionData))
      .digest('hex');

    // Store blockchain record
    await this.storeBlockchainTransaction(transactionId, transactionData);

    return transactionId;
  }

  /**
   * Generate Merkle proof for vote verification
   */
  private async generateMerkleProof(voteId: string, voteHash: string): Promise<string[]> {
    // Get all votes for this motion to build Merkle tree
    const { data: allVotes } = await this.supabase
      .from('board_room_vote_records')
      .select('blockchain_hash')
      .eq('vote_id', voteId);

    if (!allVotes) return [];

    const hashes = allVotes.map(vote => vote.blockchain_hash).sort();
    return this.buildMerkleProof(hashes, voteHash);
  }

  /**
   * Build Merkle proof for hash verification
   */
  private buildMerkleProof(hashes: string[], targetHash: string): string[] {
    if (hashes.length === 0) return [];
    if (hashes.length === 1) return hashes[0] === targetHash ? [] : [hashes[0]];

    const proof: string[] = [];
    let currentLevel = hashes;
    let targetIndex = currentLevel.indexOf(targetHash);

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);

        if (i === targetIndex || i + 1 === targetIndex) {
          const sibling = i === targetIndex ? right : left;
          if (sibling !== left || sibling !== right) {
            proof.push(sibling);
          }
          targetIndex = Math.floor(i / 2);
        }
      }

      currentLevel = nextLevel;
    }

    return proof;
  }

  /**
   * Initialize blockchain vote record
   */
  private async initializeBlockchainVote(motionId: string, blockchainHash: string): Promise<void> {
    // Record initial blockchain state
    await this.recordBlockchainEvent(motionId, 'vote_initialized', {
      motion_id: motionId,
      blockchain_hash: blockchainHash,
      initialized_at: new Date().toISOString()
    });
  }

  /**
   * Record blockchain event
   */
  private async recordBlockchainEvent(motionId: string, eventType: string, eventData: any): Promise<string> {
    const transactionData = {
      motion_id: motionId,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString()
    };

    return await this.recordBlockchainVote(
      await this.generateVoteHash(transactionData),
      transactionData
    );
  }

  /**
   * Store blockchain transaction
   */
  private async storeBlockchainTransaction(transactionId: string, transactionData: any): Promise<void> {
    // In production, store in dedicated blockchain storage
    console.log(`Blockchain transaction ${transactionId}:`, transactionData);
  }

  /**
   * Verify all votes on blockchain
   */
  private async verifyBlockchainVotes(motionId: string): Promise<boolean> {
    const { data: votes } = await this.supabase
      .from('board_room_vote_records')
      .select('*')
      .eq('vote_id', motionId);

    if (!votes) return true;

    for (const vote of votes) {
      const verified = await this.verifyVoteIntegrity(vote.id);
      if (!verified) return false;
    }

    return true;
  }

  /**
   * Update motion statistics
   */
  private async updateMotionStats(motionId: string): Promise<void> {
    const { data: stats } = await this.supabase
      .rpc('get_vote_statistics', { motion_id: motionId });

    if (stats) {
      await this.supabase
        .from('board_room_votes')
        .update({
          votes_for: stats.votes_for,
          votes_against: stats.votes_against,
          abstentions: stats.abstentions,
          quorum_met: stats.quorum_met
        })
        .eq('id', motionId);
    }
  }

  /**
   * Check if voting should auto-complete
   */
  private async checkVotingCompletion(motionId: string): Promise<void> {
    const { data: motion } = await this.supabase
      .from('board_room_votes')
      .select('*')
      .eq('id', motionId)
      .single();

    if (!motion || motion.status !== 'active') return;

    const totalVotes = (motion.votes_for || 0) + (motion.votes_against || 0) + (motion.abstentions || 0);

    // Auto-complete if all required votes are cast
    if (totalVotes >= motion.required_votes) {
      await this.endVotingMotion(motionId, 'system');
    }
  }

  /**
   * Calculate vote result
   */
  private calculateVoteResult(voteStats: any): VotingResults['result'] {
    if (!voteStats.quorum_met) {
      return 'no_quorum';
    }

    const totalDecisiveVotes = voteStats.votes_for + voteStats.votes_against;
    const forPercentage = totalDecisiveVotes > 0 ? voteStats.votes_for / totalDecisiveVotes : 0;

    // Simple majority by default
    return forPercentage > 0.5 ? 'passed' : 'failed';
  }

  /**
   * Calculate participation rate
   */
  private calculateParticipationRate(motion: any): number {
    const totalVotes = (motion.votes_for || 0) + (motion.votes_against || 0) + (motion.abstentions || 0);
    return motion.required_votes > 0 ? (totalVotes / motion.required_votes) * 100 : 0;
  }

  /**
   * Get vote audit trail
   */
  private async getVoteAuditTrail(motionId: string): Promise<VoteAuditTrail[]> {
    // Mock implementation - in production, retrieve from blockchain
    return [];
  }

  /**
   * Get motion details
   */
  private async getMotion(motionId: string): Promise<VotingMotion | null> {
    const { data: motion } = await this.supabase
      .from('board_room_votes')
      .select('*')
      .eq('id', motionId)
      .single();

    return motion ? this.mapDatabaseToMotion(motion) : null;
  }

  /**
   * Map database record to VotingMotion
   */
  private mapDatabaseToMotion(dbMotion: any): VotingMotion {
    return {
      id: dbMotion.id,
      sessionId: dbMotion.session_id,
      title: dbMotion.motion_title,
      description: dbMotion.motion_description,
      type: dbMotion.vote_type,
      isAnonymous: dbMotion.is_anonymous,
      blockchainEnabled: dbMotion.blockchain_enabled,
      startedBy: dbMotion.started_by,
      startTime: new Date(dbMotion.started_at || dbMotion.created_at),
      endTime: dbMotion.ended_at ? new Date(dbMotion.ended_at) : undefined,
      status: dbMotion.status,
      requiredVotes: dbMotion.required_votes,
      quorumRequired: dbMotion.quorum_required,
      results: dbMotion.status === 'ended' ? {
        votesFor: dbMotion.votes_for || 0,
        votesAgainst: dbMotion.votes_against || 0,
        abstentions: dbMotion.abstentions || 0,
        totalVotes: (dbMotion.votes_for || 0) + (dbMotion.votes_against || 0) + (dbMotion.abstentions || 0),
        quorumMet: dbMotion.quorum_met || false,
        result: dbMotion.result,
        participationRate: this.calculateParticipationRate(dbMotion),
        blockchainVerified: false // Would be verified asynchronously
      } : undefined
    };
  }

  /**
   * Extract public key from private key (mock implementation)
   */
  private getPublicKeyFromPrivate(privateKey: string): string {
    // In production, use proper cryptographic library
    return privateKey + '_public';
  }
}

export default BlockchainVotingService;