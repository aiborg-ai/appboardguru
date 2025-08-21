/**
 * Voice Collaboration Utilities
 * Helper functions for spatial audio, WebRTC, and collaboration management
 */

import { 
  SpatialPosition, 
  VoiceParticipant, 
  AudioProcessingSettings,
  SpatialAudioConfig,
  VoiceCollaborationSession,
  ConnectionStatistics
} from '@/types/voice-collaboration';

// === Spatial Audio Utilities ===

/**
 * Calculate 3D audio parameters for spatial positioning
 */
export function calculateSpatialAudioParams(
  listenerPosition: SpatialPosition,
  speakerPosition: SpatialPosition,
  roomConfig: SpatialAudioConfig
) {
  // Calculate distance between listener and speaker
  const dx = speakerPosition.x - listenerPosition.x;
  const dy = speakerPosition.y - listenerPosition.y;
  const dz = speakerPosition.z - listenerPosition.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Calculate angle relative to listener orientation
  const angleToSpeaker = Math.atan2(dy, dx) * 180 / Math.PI;
  const relativeAngle = (angleToSpeaker - listenerPosition.orientation + 360) % 360;

  // Convert to stereo panning (-1 to 1)
  let pan = 0;
  if (relativeAngle <= 90) {
    pan = relativeAngle / 90;
  } else if (relativeAngle <= 180) {
    pan = 1;
  } else if (relativeAngle <= 270) {
    pan = (270 - relativeAngle) / 90;
  } else {
    pan = -1;
  }

  // Calculate volume based on distance and room acoustics
  let volume = 1.0;
  if (roomConfig.acoustics.distanceAttenuation) {
    // Inverse square law with minimum volume
    volume = Math.max(0.1, 1.0 / (1.0 + distance * distance * 2));
  }

  // Apply room acoustics
  const reverberation = roomConfig.acoustics.reverberation / 100;
  const absorption = roomConfig.acoustics.absorption / 100;
  const reflection = roomConfig.acoustics.reflection / 100;

  return {
    pan,
    volume: volume * (1 - absorption * 0.3),
    distance,
    reverberation: reverberation * (1 - absorption),
    reflection: reflection * (1 - absorption),
    relativeAngle
  };
}

/**
 * Generate zone-based spatial positions for meeting layouts
 */
export function generateZonePositions(zone: string, participantCount: number): SpatialPosition[] {
  const positions: SpatialPosition[] = [];

  switch (zone) {
    case 'discussion':
      // Circular arrangement for discussions
      for (let i = 0; i < participantCount; i++) {
        const angle = (i * 360 / participantCount) * (Math.PI / 180);
        const radius = 0.7;
        positions.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0,
          orientation: (angle * 180 / Math.PI + 180) % 360,
          zone: 'discussion'
        });
      }
      break;

    case 'presentation':
      // Audience arrangement facing presenter
      const presenter: SpatialPosition = { x: 0, y: 0.8, z: 0.1, orientation: 180, zone: 'presentation' };
      positions.push(presenter);
      
      // Arrange audience in rows
      for (let i = 1; i < participantCount; i++) {
        const row = Math.floor((i - 1) / 4);
        const col = (i - 1) % 4;
        positions.push({
          x: (col - 1.5) * 0.3,
          y: -0.3 - row * 0.4,
          z: 0,
          orientation: 0,
          zone: 'presentation'
        });
      }
      break;

    case 'breakout':
      // Small group clusters
      const clustersPerGroup = Math.ceil(participantCount / 4);
      for (let i = 0; i < participantCount; i++) {
        const groupIndex = Math.floor(i / 4);
        const positionInGroup = i % 4;
        const groupAngle = (groupIndex * 120) * (Math.PI / 180);
        const groupRadius = 1.0;
        
        const localAngle = (positionInGroup * 90) * (Math.PI / 180);
        const localRadius = 0.4;
        
        positions.push({
          x: Math.cos(groupAngle) * groupRadius + Math.cos(localAngle) * localRadius,
          y: Math.sin(groupAngle) * groupRadius + Math.sin(localAngle) * localRadius,
          z: 0,
          orientation: (localAngle * 180 / Math.PI + 180) % 360,
          zone: 'breakout'
        });
      }
      break;

    default:
      // Default center arrangement
      positions.push({ x: 0, y: 0, z: 0, orientation: 0, zone: 'center' });
  }

  return positions;
}

/**
 * Optimize spatial positions to avoid clustering
 */
export function optimizeSpatialPositions(positions: SpatialPosition[]): SpatialPosition[] {
  const optimized = [...positions];
  const minDistance = 0.3; // Minimum distance between participants

  for (let i = 0; i < optimized.length; i++) {
    for (let j = i + 1; j < optimized.length; j++) {
      const pos1 = optimized[i];
      const pos2 = optimized[j];
      
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        // Move participants apart
        const pushDistance = (minDistance - distance) / 2;
        const angle = Math.atan2(dy, dx);
        
        optimized[i].x -= Math.cos(angle) * pushDistance;
        optimized[i].y -= Math.sin(angle) * pushDistance;
        optimized[j].x += Math.cos(angle) * pushDistance;
        optimized[j].y += Math.sin(angle) * pushDistance;
      }
    }
  }

  return optimized;
}

// === WebRTC Utilities ===

/**
 * Create optimized WebRTC configuration for voice collaboration
 */
export function createWebRTCConfiguration(spatialAudioEnabled: boolean): RTCConfiguration {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers for production
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all'
  };
}

/**
 * Create audio constraints for spatial audio
 */
export function createAudioConstraints(
  spatialAudioEnabled: boolean,
  processingSettings: AudioProcessingSettings
): MediaTrackConstraints {
  return {
    sampleRate: { ideal: 48000 },
    channelCount: { ideal: spatialAudioEnabled ? 2 : 1 },
    echoCancellation: processingSettings.echoCancellation,
    noiseSuppression: processingSettings.noiseSuppression,
    autoGainControl: processingSettings.autoGainControl,
    sampleSize: { ideal: 16 },
    latency: { ideal: 0.01 }, // 10ms latency for real-time feel
    volume: { ideal: 1.0 }
  };
}

/**
 * Monitor WebRTC connection quality
 */
export async function monitorConnectionQuality(
  peerConnection: RTCPeerConnection,
  callback: (stats: ConnectionStatistics) => void
): Promise<() => void> {
  let monitoring = true;
  
  const monitor = async () => {
    if (!monitoring || peerConnection.connectionState === 'closed') return;
    
    try {
      const stats = await peerConnection.getStats();
      const audioStats = Array.from(stats.values()).find(
        (stat: any) => stat.type === 'inbound-rtp' && stat.mediaType === 'audio'
      ) as any;
      
      if (audioStats) {
        const connectionStats: ConnectionStatistics = {
          audioLevel: audioStats.audioLevel || 0,
          packetsLost: audioStats.packetsLost || 0,
          packetsReceived: audioStats.packetsReceived || 0,
          bytesReceived: audioStats.bytesReceived || 0,
          bytesSent: 0, // Would get from outbound stats
          roundTripTime: audioStats.roundTripTime ? audioStats.roundTripTime * 1000 : 0,
          jitter: audioStats.jitter || 0,
          qualityScore: calculateQualityScore(audioStats)
        };
        
        callback(connectionStats);
      }
    } catch (error) {
      console.error('Connection monitoring error:', error);
    }
    
    setTimeout(monitor, 1000); // Monitor every second
  };
  
  monitor();
  
  return () => {
    monitoring = false;
  };
}

function calculateQualityScore(stats: any): number {
  let score = 100;
  
  // Packet loss impact
  const packetLossRate = stats.packetsLost / (stats.packetsReceived + stats.packetsLost);
  score -= packetLossRate * 100;
  
  // Jitter impact (higher jitter reduces quality)
  score -= Math.min(stats.jitter * 1000, 20); // Max 20 point reduction
  
  // Round trip time impact
  if (stats.roundTripTime > 0.2) { // Above 200ms
    score -= 20;
  } else if (stats.roundTripTime > 0.1) { // Above 100ms
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

// === Audio Processing Utilities ===

/**
 * Apply spatial audio processing to audio context
 */
export function applySpatialAudioProcessing(
  audioContext: AudioContext,
  sourceNode: MediaStreamAudioSourceNode,
  spatialParams: ReturnType<typeof calculateSpatialAudioParams>
): AudioNode {
  // Create processing chain
  const gainNode = audioContext.createGain();
  const pannerNode = audioContext.createStereoPanner();
  const delayNode = audioContext.createDelay();
  const reverbNode = createReverbNode(audioContext, spatialParams.reverberation);
  
  // Apply spatial parameters
  gainNode.gain.value = spatialParams.volume;
  pannerNode.pan.value = spatialParams.pan;
  delayNode.delayTime.value = spatialParams.distance * 0.001; // 1ms per unit distance
  
  // Connect processing chain
  sourceNode
    .connect(gainNode)
    .connect(pannerNode)
    .connect(delayNode)
    .connect(reverbNode)
    .connect(audioContext.destination);
  
  return reverbNode;
}

/**
 * Create reverb effect for spatial audio
 */
function createReverbNode(audioContext: AudioContext, reverbAmount: number): ConvolverNode {
  const convolver = audioContext.createConvolver();
  
  // Generate impulse response for reverb
  const length = audioContext.sampleRate * 2; // 2 seconds
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2);
      channelData[i] = (Math.random() * 2 - 1) * decay * reverbAmount;
    }
  }
  
  convolver.buffer = impulse;
  return convolver;
}

/**
 * Voice activity detection
 */
export class VoiceActivityDetector {
  private audioContext: AudioContext;
  private analyzerNode: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private callback: (isActive: boolean, volume: number) => void;
  private isActive: boolean = false;
  private animationFrame?: number;

  constructor(
    audioContext: AudioContext,
    sourceNode: MediaStreamAudioSourceNode,
    threshold: number = -30,
    callback: (isActive: boolean, volume: number) => void
  ) {
    this.audioContext = audioContext;
    this.threshold = threshold;
    this.callback = callback;

    // Create analyzer
    this.analyzerNode = audioContext.createAnalyser();
    this.analyzerNode.fftSize = 256;
    this.analyzerNode.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyzerNode.frequencyBinCount);

    // Connect audio source to analyzer
    sourceNode.connect(this.analyzerNode);

    this.startDetection();
  }

  private startDetection() {
    const detect = () => {
      this.analyzerNode.getByteFrequencyData(this.dataArray);
      
      // Calculate volume (RMS)
      const sum = this.dataArray.reduce((acc, value) => acc + value * value, 0);
      const rms = Math.sqrt(sum / this.dataArray.length);
      const volume = 20 * Math.log10(rms / 255); // Convert to dB
      
      const currentlyActive = volume > this.threshold;
      
      if (currentlyActive !== this.isActive) {
        this.isActive = currentlyActive;
        this.callback(currentlyActive, volume);
      }
      
      this.animationFrame = requestAnimationFrame(detect);
    };
    
    detect();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  updateThreshold(threshold: number) {
    this.threshold = threshold;
  }
}

// === Session Management Utilities ===

/**
 * Calculate optimal spatial arrangement for participants
 */
export function calculateOptimalArrangement(
  participants: VoiceParticipant[],
  sessionType: VoiceCollaborationSession['collaborationType']
): Record<string, SpatialPosition> {
  const arrangement: Record<string, SpatialPosition> = {};
  
  // Find host
  const host = participants.find(p => p.role === 'host');
  const others = participants.filter(p => p.role !== 'host');
  
  switch (sessionType) {
    case 'meeting':
      // Host at head of table, others around
      if (host) {
        arrangement[host.id] = { x: 0, y: 0.8, z: 0, orientation: 180, zone: 'center' };
      }
      
      others.forEach((participant, index) => {
        const angle = (index * 360 / others.length) * (Math.PI / 180);
        const radius = 0.6;
        arrangement[participant.id] = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius - 0.2,
          z: 0,
          orientation: (angle * 180 / Math.PI + 180) % 360,
          zone: 'discussion'
        };
      });
      break;
      
    case 'document_review':
      // Semicircle facing shared document
      participants.forEach((participant, index) => {
        const angle = ((index * 180 / (participants.length - 1)) - 90) * (Math.PI / 180);
        const radius = 0.7;
        arrangement[participant.id] = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0,
          orientation: 0, // All facing forward
          zone: 'presentation'
        };
      });
      break;
      
    case 'brainstorm':
      // Loose circle for creative discussion
      participants.forEach((participant, index) => {
        const angle = (index * 360 / participants.length) * (Math.PI / 180);
        const radius = 0.8 + Math.random() * 0.2; // Add some randomness
        arrangement[participant.id] = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: Math.random() * 0.1 - 0.05,
          orientation: (angle * 180 / Math.PI + 180 + Math.random() * 60 - 30) % 360,
          zone: 'discussion'
        };
      });
      break;
      
    default:
      // Default circular arrangement
      participants.forEach((participant, index) => {
        const angle = (index * 360 / participants.length) * (Math.PI / 180);
        const radius = 0.6;
        arrangement[participant.id] = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0,
          orientation: (angle * 180 / Math.PI + 180) % 360,
          zone: 'discussion'
        };
      });
  }
  
  return arrangement;
}

/**
 * Validate spatial positions are within room bounds
 */
export function validateSpatialPosition(position: SpatialPosition): boolean {
  return (
    position.x >= -1 && position.x <= 1 &&
    position.y >= -1 && position.y <= 1 &&
    position.z >= -1 && position.z <= 1 &&
    position.orientation >= 0 && position.orientation <= 360
  );
}

/**
 * Smooth position transitions for natural movement
 */
export function createPositionTransition(
  fromPosition: SpatialPosition,
  toPosition: SpatialPosition,
  duration: number = 1000,
  callback: (position: SpatialPosition) => void
): () => void {
  let startTime: number;
  let animationFrame: number;
  
  const animate = (currentTime: number) => {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    
    // Smooth easing function
    const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    
    const currentPosition: SpatialPosition = {
      x: fromPosition.x + (toPosition.x - fromPosition.x) * easeProgress,
      y: fromPosition.y + (toPosition.y - fromPosition.y) * easeProgress,
      z: fromPosition.z + (toPosition.z - fromPosition.z) * easeProgress,
      orientation: fromPosition.orientation + 
        (toPosition.orientation - fromPosition.orientation) * easeProgress,
      zone: progress > 0.5 ? toPosition.zone : fromPosition.zone
    };
    
    callback(currentPosition);
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    }
  };
  
  animationFrame = requestAnimationFrame(animate);
  
  return () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  };
}

// === Audio Quality Utilities ===

/**
 * Analyze audio quality metrics
 */
export function analyzeAudioQuality(
  audioBuffer: AudioBuffer,
  sampleRate: number = 48000
): {
  signalToNoiseRatio: number;
  dynamicRange: number;
  clipCount: number;
  averageAmplitude: number;
  qualityScore: number;
} {
  const channelData = audioBuffer.getChannelData(0);
  const length = channelData.length;
  
  // Calculate RMS and peak
  let sumSquares = 0;
  let peak = 0;
  let clipCount = 0;
  
  for (let i = 0; i < length; i++) {
    const sample = Math.abs(channelData[i]);
    sumSquares += sample * sample;
    peak = Math.max(peak, sample);
    
    if (sample >= 0.99) {
      clipCount++;
    }
  }
  
  const rms = Math.sqrt(sumSquares / length);
  const averageAmplitude = rms;
  
  // Estimate noise floor (lowest 10% of samples)
  const sortedSamples = Array.from(channelData)
    .map(Math.abs)
    .sort((a, b) => a - b);
  const noiseFloor = sortedSamples[Math.floor(length * 0.1)];
  
  const signalToNoiseRatio = 20 * Math.log10(rms / Math.max(noiseFloor, 0.001));
  const dynamicRange = 20 * Math.log10(peak / Math.max(rms, 0.001));
  
  // Calculate overall quality score
  let qualityScore = 100;
  qualityScore -= Math.max(0, 40 - signalToNoiseRatio); // Penalty for low SNR
  qualityScore -= (clipCount / length) * 1000; // Penalty for clipping
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  return {
    signalToNoiseRatio,
    dynamicRange,
    clipCount,
    averageAmplitude,
    qualityScore
  };
}

/**
 * Real-time audio level meter
 */
export class AudioLevelMeter {
  private analyzerNode: AnalyserNode;
  private dataArray: Uint8Array;
  private callback: (level: number) => void;
  private animationFrame?: number;

  constructor(
    audioContext: AudioContext,
    sourceNode: AudioNode,
    callback: (level: number) => void
  ) {
    this.callback = callback;
    
    this.analyzerNode = audioContext.createAnalyser();
    this.analyzerNode.fftSize = 256;
    this.analyzerNode.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyzerNode.frequencyBinCount);
    
    sourceNode.connect(this.analyzerNode);
    this.startMeasuring();
  }

  private startMeasuring() {
    const measure = () => {
      this.analyzerNode.getByteFrequencyData(this.dataArray);
      
      const sum = this.dataArray.reduce((acc, value) => acc + value * value, 0);
      const rms = Math.sqrt(sum / this.dataArray.length);
      const level = Math.min(rms / 128, 1); // Normalize to 0-1
      
      this.callback(level);
      this.animationFrame = requestAnimationFrame(measure);
    };
    
    measure();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}