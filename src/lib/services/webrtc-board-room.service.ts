/**
 * WebRTC Board Room Service
 * Enterprise-grade encrypted video conferencing for virtual board rooms
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service-client';
import { Database } from '@/types/database';

type SupabaseClient = ReturnType<typeof createSupabaseServiceClient>;

export interface WebRTCConfiguration {
  iceServers: RTCIceServer[];
  iceTransportPolicy: RTCIceTransportPolicy;
  bundlePolicy: RTCBundlePolicy;
  rtcpMuxPolicy: RTCRtcpMuxPolicy;
  iceCandidatePoolSize: number;
}

export interface MediaConstraints {
  video: {
    width: { min: number; ideal: number; max: number };
    height: { min: number; ideal: number; max: number };
    frameRate: { min: number; ideal: number; max: number };
    facingMode?: string;
  };
  audio: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    sampleRate: number;
    channelCount: number;
  };
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keySize: number;
  dtlsFingerprint?: string;
  srtpCryptoSuite?: string;
}

export interface ParticipantConnection {
  id: string;
  userId: string;
  peerId: string;
  peerConnection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  dataChannel?: RTCDataChannel;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  encryption: EncryptionConfig;
  lastActivity: Date;
  stats: RTCStatsReport | null;
}

export interface SessionStats {
  sessionId: string;
  totalParticipants: number;
  activeConnections: number;
  averageBitrate: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  qualityScore: number;
}

export class WebRTCBoardRoomService {
  private supabase: SupabaseClient;
  private rtcConfiguration: WebRTCConfiguration;
  private mediaConstraints: MediaConstraints;
  private connections: Map<string, ParticipantConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenShareStream: MediaStream | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private eventEmitter: EventTarget = new EventTarget();
  private statsCollectionInterval: NodeJS.Timeout | null = null;
  private encryptionKeys: Map<string, CryptoKey> = new Map();

  constructor() {
    this.supabase = createSupabaseServiceClient();
    
    // Enterprise-grade WebRTC configuration
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for enterprise deployment
        {
          urls: ['turn:turnserver.example.com:3478'],
          username: process.env.TURN_USERNAME,
          credential: process.env.TURN_PASSWORD
        }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10
    };

    // High-quality media constraints
    this.mediaConstraints = {
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        frameRate: { min: 15, ideal: 30, max: 60 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2
      }
    };
  }

  /**
   * Initialize board room session
   */
  async initializeSession(sessionId: string, userId: string): Promise<void> {
    this.sessionId = sessionId;
    this.userId = userId;

    // Get session encryption keys
    const { data: session } = await this.supabase
      .from('board_room_sessions')
      .select('encryption_key_id, security_level')
      .eq('id', sessionId)
      .single();

    if (session?.encryption_key_id) {
      await this.loadEncryptionKey(session.encryption_key_id);
    }

    // Start stats collection
    this.startStatsCollection();

    this.emit('sessionInitialized', { sessionId, userId });
  }

  /**
   * Join board room session
   */
  async joinSession(participantRole: string): Promise<void> {
    if (!this.sessionId || !this.userId) {
      throw new Error('Session not initialized');
    }

    try {
      // Update participant status
      await this.supabase
        .from('board_room_participants')
        .upsert({
          session_id: this.sessionId,
          user_id: this.userId,
          participant_role: participantRole,
          is_present: true,
          join_time: new Date().toISOString()
        });

      // Initialize local media
      await this.initializeLocalMedia();

      // Connect to existing participants
      await this.connectToExistingParticipants();

      this.emit('sessionJoined', { sessionId: this.sessionId, userId: this.userId });
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    }
  }

  /**
   * Leave board room session
   */
  async leaveSession(): Promise<void> {
    if (!this.sessionId || !this.userId) return;

    try {
      // Close all peer connections
      for (const connection of this.connections.values()) {
        await this.closePeerConnection(connection);
      }

      // Stop local streams
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      if (this.screenShareStream) {
        this.screenShareStream.getTracks().forEach(track => track.stop());
        this.screenShareStream = null;
      }

      // Update participant status
      await this.supabase
        .from('board_room_participants')
        .update({
          is_present: false,
          leave_time: new Date().toISOString()
        })
        .eq('session_id', this.sessionId)
        .eq('user_id', this.userId);

      // Stop stats collection
      if (this.statsCollectionInterval) {
        clearInterval(this.statsCollectionInterval);
        this.statsCollectionInterval = null;
      }

      this.emit('sessionLeft', { sessionId: this.sessionId, userId: this.userId });
      
      this.sessionId = null;
      this.userId = null;
      this.connections.clear();
    } catch (error) {
      console.error('Failed to leave session:', error);
      throw error;
    }
  }

  /**
   * Create peer connection with encryption
   */
  async createPeerConnection(peerId: string, isInitiator: boolean): Promise<ParticipantConnection> {
    const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
    
    // Enable DTLS-SRTP encryption
    const encryptionConfig: EncryptionConfig = {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keySize: 256,
      srtpCryptoSuite: 'AES_CM_128_HMAC_SHA1_80'
    };

    const connection: ParticipantConnection = {
      id: crypto.randomUUID(),
      userId: peerId,
      peerId,
      peerConnection,
      connectionState: 'new',
      iceConnectionState: 'new',
      encryption: encryptionConfig,
      lastActivity: new Date(),
      stats: null
    };

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Create secure data channel for board room communications
    if (isInitiator) {
      const dataChannel = peerConnection.createDataChannel('boardroom', {
        ordered: true,
        protocol: 'encrypted-board-room-v1'
      });
      
      connection.dataChannel = dataChannel;
      this.setupDataChannelHandlers(dataChannel, connection);
    }

    // Set up event handlers
    this.setupPeerConnectionHandlers(connection);

    // Store connection
    this.connections.set(peerId, connection);

    // Record connection in database
    await this.recordWebRTCConnection(connection);

    return connection;
  }

  /**
   * Initialize local media streams
   */
  private async initializeLocalMedia(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);
      this.emit('localStreamReady', { stream: this.localStream });
    } catch (error) {
      console.error('Failed to initialize local media:', error);
      throw error;
    }
  }

  /**
   * Start screen sharing with encryption
   */
  async startScreenShare(): Promise<MediaStream> {
    try {
      const screenConstraints = {
        video: {
          mediaSource: 'screen',
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 }
        },
        audio: true
      };

      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);

      // Replace video track in all peer connections
      const videoTrack = this.screenShareStream.getVideoTracks()[0];
      if (videoTrack) {
        for (const connection of this.connections.values()) {
          const sender = connection.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
      }

      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      this.emit('screenShareStarted', { stream: this.screenShareStream });
      return this.screenShareStream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.screenShareStream) return;

    try {
      this.screenShareStream.getTracks().forEach(track => track.stop());
      this.screenShareStream = null;

      // Restore camera video in all peer connections
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          for (const connection of this.connections.values()) {
            const sender = connection.peerConnection.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            
            if (sender) {
              await sender.replaceTrack(videoTrack);
            }
          }
        }
      }

      this.emit('screenShareStopped');
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute audio
   */
  toggleAudio(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      
      this.emit('audioToggled', { muted });
    }
  }

  /**
   * Enable/disable video
   */
  toggleVideo(disabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !disabled;
      });
      
      this.emit('videoToggled', { disabled });
    }
  }

  /**
   * Send encrypted data message
   */
  async sendSecureMessage(message: any, targetPeerId?: string): Promise<void> {
    const encryptedMessage = await this.encryptMessage(JSON.stringify(message));
    
    if (targetPeerId) {
      const connection = this.connections.get(targetPeerId);
      if (connection?.dataChannel && connection.dataChannel.readyState === 'open') {
        connection.dataChannel.send(encryptedMessage);
      }
    } else {
      // Broadcast to all connections
      for (const connection of this.connections.values()) {
        if (connection.dataChannel && connection.dataChannel.readyState === 'open') {
          connection.dataChannel.send(encryptedMessage);
        }
      }
    }
  }

  /**
   * Get real-time session statistics
   */
  async getSessionStats(): Promise<SessionStats> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    let totalBitrate = 0;
    let totalPacketsLost = 0;
    let totalJitter = 0;
    let totalRtt = 0;
    let activeConnections = 0;

    for (const connection of this.connections.values()) {
      if (connection.peerConnection.connectionState === 'connected') {
        activeConnections++;
        
        const stats = await connection.peerConnection.getStats();
        connection.stats = stats;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            totalBitrate += report.bytesReceived || 0;
            totalPacketsLost += report.packetsLost || 0;
            totalJitter += report.jitter || 0;
          }
          
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            totalRtt += report.currentRoundTripTime || 0;
          }
        });
      }
    }

    const sessionStats: SessionStats = {
      sessionId: this.sessionId,
      totalParticipants: this.connections.size,
      activeConnections,
      averageBitrate: activeConnections > 0 ? totalBitrate / activeConnections : 0,
      packetsLost: totalPacketsLost,
      jitter: activeConnections > 0 ? totalJitter / activeConnections : 0,
      roundTripTime: activeConnections > 0 ? totalRtt / activeConnections : 0,
      qualityScore: this.calculateQualityScore(totalPacketsLost, totalJitter, totalRtt)
    };

    return sessionStats;
  }

  /**
   * Setup peer connection event handlers
   */
  private setupPeerConnectionHandlers(connection: ParticipantConnection): void {
    const { peerConnection } = connection;

    peerConnection.onconnectionstatechange = () => {
      connection.connectionState = peerConnection.connectionState;
      connection.lastActivity = new Date();
      
      this.emit('connectionStateChanged', {
        peerId: connection.peerId,
        state: peerConnection.connectionState
      });

      // Update database
      this.updateConnectionState(connection);
    };

    peerConnection.oniceconnectionstatechange = () => {
      connection.iceConnectionState = peerConnection.iceConnectionState;
      
      this.emit('iceConnectionStateChanged', {
        peerId: connection.peerId,
        state: peerConnection.iceConnectionState
      });
    };

    peerConnection.ontrack = (event) => {
      connection.remoteStream = event.streams[0];
      this.emit('remoteStreamReceived', {
        peerId: connection.peerId,
        stream: event.streams[0]
      });
    };

    peerConnection.ondatachannel = (event) => {
      connection.dataChannel = event.channel;
      this.setupDataChannelHandlers(event.channel, connection);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.handleIceCandidate(connection, event.candidate);
      }
    };
  }

  /**
   * Setup data channel handlers for secure messaging
   */
  private setupDataChannelHandlers(dataChannel: RTCDataChannel, connection: ParticipantConnection): void {
    dataChannel.onopen = () => {
      this.emit('dataChannelOpened', { peerId: connection.peerId });
    };

    dataChannel.onmessage = async (event) => {
      try {
        const decryptedMessage = await this.decryptMessage(event.data);
        const message = JSON.parse(decryptedMessage);
        
        this.emit('secureMessageReceived', {
          peerId: connection.peerId,
          message
        });
      } catch (error) {
        console.error('Failed to decrypt message:', error);
      }
    };

    dataChannel.onclose = () => {
      this.emit('dataChannelClosed', { peerId: connection.peerId });
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.emit('dataChannelError', { peerId: connection.peerId, error });
    };
  }

  /**
   * Connect to existing participants in the session
   */
  private async connectToExistingParticipants(): Promise<void> {
    if (!this.sessionId) return;

    const { data: participants } = await this.supabase
      .from('board_room_participants')
      .select('user_id')
      .eq('session_id', this.sessionId)
      .eq('is_present', true)
      .neq('user_id', this.userId);

    if (participants) {
      for (const participant of participants) {
        await this.createPeerConnection(participant.user_id, true);
      }
    }
  }

  /**
   * Handle ICE candidate exchange
   */
  private async handleIceCandidate(connection: ParticipantConnection, candidate: RTCIceCandidate): Promise<void> {
    // Store ICE candidate in database for signaling
    await this.supabase
      .from('webrtc_connections')
      .update({
        ice_candidates: [...(connection as any).iceCandidates || [], candidate.toJSON()],
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);
  }

  /**
   * Record WebRTC connection in database
   */
  private async recordWebRTCConnection(connection: ParticipantConnection): Promise<void> {
    if (!this.sessionId) return;

    const participant = await this.supabase
      .from('board_room_participants')
      .select('id')
      .eq('session_id', this.sessionId)
      .eq('user_id', connection.userId)
      .single();

    if (participant.data) {
      await this.supabase
        .from('webrtc_connections')
        .insert({
          id: connection.id,
          session_id: this.sessionId,
          participant_id: participant.data.id,
          connection_id: connection.id,
          peer_id: connection.peerId,
          connection_type: 'video',
          connection_state: connection.connectionState,
          encryption_enabled: connection.encryption.enabled,
          dtls_fingerprint: connection.encryption.dtlsFingerprint,
          srtp_crypto_suite: connection.encryption.srtpCryptoSuite
        });
    }
  }

  /**
   * Update connection state in database
   */
  private async updateConnectionState(connection: ParticipantConnection): Promise<void> {
    await this.supabase
      .from('webrtc_connections')
      .update({
        connection_state: connection.connectionState,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);
  }

  /**
   * Start periodic stats collection
   */
  private startStatsCollection(): void {
    this.statsCollectionInterval = setInterval(async () => {
      if (this.connections.size > 0) {
        const stats = await this.getSessionStats();
        this.emit('statsUpdated', stats);
        
        // Store stats in database for monitoring
        await this.storeSessionStats(stats);
      }
    }, 5000); // Collect stats every 5 seconds
  }

  /**
   * Store session statistics for monitoring
   */
  private async storeSessionStats(stats: SessionStats): Promise<void> {
    // Store in session metadata for real-time monitoring
    await this.supabase
      .from('board_room_sessions')
      .update({
        metadata: {
          current_stats: stats,
          last_stats_update: new Date().toISOString()
        }
      })
      .eq('id', stats.sessionId);
  }

  /**
   * Load encryption key for session
   */
  private async loadEncryptionKey(keyId: string): Promise<void> {
    const { data: keyData } = await this.supabase
      .from('board_room_encryption_keys')
      .select('key_data_encrypted, key_algorithm')
      .eq('id', keyId)
      .single();

    if (keyData) {
      // In production, decrypt the key using secure key management
      const keyMaterial = new TextEncoder().encode(keyData.key_data_encrypted);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      
      this.encryptionKeys.set(keyId, cryptoKey);
    }
  }

  /**
   * Encrypt message for secure transmission
   */
  private async encryptMessage(message: string): Promise<string> {
    const keyId = Array.from(this.encryptionKeys.keys())[0];
    const key = this.encryptionKeys.get(keyId!);
    
    if (!key) {
      throw new Error('No encryption key available');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedMessage
    );

    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedArray.set(iv, 0);
    encryptedArray.set(new Uint8Array(encryptedData), iv.length);
    
    return btoa(String.fromCharCode(...encryptedArray));
  }

  /**
   * Decrypt received message
   */
  private async decryptMessage(encryptedMessage: string): Promise<string> {
    const keyId = Array.from(this.encryptionKeys.keys())[0];
    const key = this.encryptionKeys.get(keyId!);
    
    if (!key) {
      throw new Error('No encryption key available');
    }

    const encryptedArray = new Uint8Array(
      atob(encryptedMessage).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = encryptedArray.slice(0, 12);
    const encryptedData = encryptedArray.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  }

  /**
   * Calculate quality score based on connection metrics
   */
  private calculateQualityScore(packetsLost: number, jitter: number, rtt: number): number {
    let score = 100;
    
    // Deduct points for packet loss
    if (packetsLost > 0) {
      score -= Math.min(packetsLost * 2, 40);
    }
    
    // Deduct points for high jitter
    if (jitter > 0.03) {
      score -= Math.min((jitter - 0.03) * 1000, 30);
    }
    
    // Deduct points for high RTT
    if (rtt > 0.15) {
      score -= Math.min((rtt - 0.15) * 200, 30);
    }
    
    return Math.max(score, 0);
  }

  /**
   * Close peer connection
   */
  private async closePeerConnection(connection: ParticipantConnection): Promise<void> {
    if (connection.dataChannel) {
      connection.dataChannel.close();
    }
    
    connection.peerConnection.close();
    
    // Update database
    await this.supabase
      .from('webrtc_connections')
      .update({
        connection_state: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);
  }

  /**
   * Event emission helper
   */
  private emit(eventType: string, data?: any): void {
    this.eventEmitter.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }

  /**
   * Add event listener
   */
  on(eventType: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(eventType, listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(eventType, listener);
  }
}

export default WebRTCBoardRoomService;