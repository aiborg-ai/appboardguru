/**
 * Voice Authentication Service
 * Enterprise-grade voice recognition for board-level security
 */

import { AudioRecorder, AudioUtils } from 'react-native-audio';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

import type {
  Result,
  UserId,
  VoiceAuthConfig,
  VoiceEnrollmentData,
  VoiceVerificationResult,
  VoiceSample,
  VoiceFeatures,
} from '@/types/mobile';
import { SECURITY, VOICE_AUTH } from '@/config/constants';
import { secureStorageService } from './SecureStorageService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VoiceAuthenticationService');

export interface VoiceEnrollmentRequest {
  readonly userId: UserId;
  readonly passphrase?: string;
  readonly samplesRequired: number;
  readonly quality: 'standard' | 'high' | 'enterprise';
}

export interface VoiceVerificationRequest {
  readonly userId: UserId;
  readonly audioSample: VoiceSample;
  readonly passphrase?: string;
  readonly confidenceThreshold: number;
}

export interface VoiceAuthenticationResult {
  readonly success: boolean;
  readonly confidence: number;
  readonly matchScore: number;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly type: 'enrollment_required' | 'verification_failed' | 'audio_quality' | 'permission_denied';
  };
}

export interface VoiceTemplate {
  readonly userId: UserId;
  readonly features: VoiceFeatures;
  readonly passphrase: string;
  readonly quality: number;
  readonly enrolledAt: string;
  readonly lastUsed?: string;
  readonly usageCount: number;
}

export class VoiceAuthenticationService {
  private isRecording = false;
  private currentRecordingPath: string | null = null;
  private recordingTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize voice authentication system
   */
  async initialize(): Promise<Result<VoiceAuthConfig>> {
    try {
      logger.info('Initializing voice authentication system');

      // Check microphone permissions
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        return {
          success: false,
          error: {
            code: 'MICROPHONE_PERMISSION_DENIED',
            message: 'Microphone permission is required for voice authentication',
          },
        };
      }

      // Initialize audio recorder
      AudioRecorder.prepareRecordingAtPath(this.getRecordingPath(), {
        SampleRate: VOICE_AUTH.SAMPLE_RATE,
        Channels: 1,
        AudioQuality: 'High',
        AudioEncoding: 'aac',
        AudioEncodingBitRate: 32000,
      });

      const config: VoiceAuthConfig = {
        enabled: true,
        sampleRate: VOICE_AUTH.SAMPLE_RATE,
        channels: 1,
        bitRate: 32000,
        maxRecordingDuration: VOICE_AUTH.MAX_RECORDING_DURATION,
        minRecordingDuration: VOICE_AUTH.MIN_RECORDING_DURATION,
        confidenceThreshold: VOICE_AUTH.DEFAULT_CONFIDENCE_THRESHOLD,
        enrollmentSamplesRequired: VOICE_AUTH.ENROLLMENT_SAMPLES_REQUIRED,
      };

      logger.info('Voice authentication system initialized successfully');
      return { success: true, data: config };
    } catch (error) {
      logger.error('Failed to initialize voice authentication', { error });
      return {
        success: false,
        error: {
          code: 'VOICE_AUTH_INIT_FAILED',
          message: 'Failed to initialize voice authentication system',
          details: error,
        },
      };
    }
  }

  /**
   * Enroll user voice for authentication
   */
  async enrollVoice(request: VoiceEnrollmentRequest): Promise<Result<VoiceEnrollmentData>> {
    try {
      logger.info('Starting voice enrollment', { 
        userId: request.userId,
        samplesRequired: request.samplesRequired 
      });

      const samples: VoiceSample[] = [];
      const passphrase = request.passphrase || this.generatePassphrase();

      // Collect voice samples
      for (let i = 0; i < request.samplesRequired; i++) {
        logger.info(`Recording voice sample ${i + 1}/${request.samplesRequired}`);
        
        const sampleResult = await this.recordVoiceSample(
          `Please say: "${passphrase}"`,
          VOICE_AUTH.ENROLLMENT_RECORDING_DURATION
        );
        
        if (!sampleResult.success || !sampleResult.data) {
          return {
            success: false,
            error: {
              code: 'VOICE_SAMPLE_RECORDING_FAILED',
              message: `Failed to record voice sample ${i + 1}`,
              details: sampleResult.error,
            },
          };
        }

        samples.push(sampleResult.data);
        
        // Add delay between samples for user comfort
        await this.delay(VOICE_AUTH.SAMPLE_INTERVAL_MS);
      }

      // Extract voice features from samples
      const featuresResult = await this.extractVoiceFeatures(samples, passphrase);
      if (!featuresResult.success || !featuresResult.data) {
        return {
          success: false,
          error: {
            code: 'VOICE_FEATURE_EXTRACTION_FAILED',
            message: 'Failed to extract voice features from samples',
            details: featuresResult.error,
          },
        };
      }

      // Create voice template
      const template: VoiceTemplate = {
        userId: request.userId,
        features: featuresResult.data,
        passphrase,
        quality: this.calculateTemplateQuality(samples),
        enrolledAt: new Date().toISOString(),
        usageCount: 0,
      };

      // Store voice template securely
      await this.storeVoiceTemplate(template);

      // Clean up sample files
      await this.cleanupSampleFiles(samples);

      const enrollmentData: VoiceEnrollmentData = {
        userId: request.userId,
        passphrase,
        samplesRecorded: samples.length,
        quality: template.quality,
        enrolledAt: template.enrolledAt,
      };

      logger.info('Voice enrollment completed successfully', {
        userId: request.userId,
        quality: template.quality,
      });

      return { success: true, data: enrollmentData };
    } catch (error) {
      logger.error('Voice enrollment failed', { error });
      return {
        success: false,
        error: {
          code: 'VOICE_ENROLLMENT_FAILED',
          message: 'Failed to complete voice enrollment',
          details: error,
        },
      };
    }
  }

  /**
   * Verify user voice authentication
   */
  async verifyVoice(request: VoiceVerificationRequest): Promise<VoiceAuthenticationResult> {
    try {
      logger.info('Starting voice verification', { userId: request.userId });

      // Get stored voice template
      const templateResult = await this.getVoiceTemplate(request.userId);
      if (!templateResult.success || !templateResult.data) {
        return {
          success: false,
          confidence: 0,
          matchScore: 0,
          error: {
            code: 'VOICE_TEMPLATE_NOT_FOUND',
            message: 'Voice template not found for user',
            type: 'enrollment_required',
          },
        };
      }

      const template = templateResult.data;

      // Extract features from verification sample
      const featuresResult = await this.extractVoiceFeatures(
        [request.audioSample],
        template.passphrase
      );
      
      if (!featuresResult.success || !featuresResult.data) {
        return {
          success: false,
          confidence: 0,
          matchScore: 0,
          error: {
            code: 'FEATURE_EXTRACTION_FAILED',
            message: 'Failed to extract features from voice sample',
            type: 'audio_quality',
          },
        };
      }

      // Compare features
      const matchScore = this.compareVoiceFeatures(template.features, featuresResult.data);
      const confidence = this.calculateConfidence(matchScore, template.quality);

      // Update usage statistics
      await this.updateTemplateUsage(request.userId);

      const success = confidence >= request.confidenceThreshold;
      
      if (success) {
        logger.info('Voice verification successful', {
          userId: request.userId,
          confidence,
          matchScore,
        });
      } else {
        logger.warn('Voice verification failed', {
          userId: request.userId,
          confidence,
          threshold: request.confidenceThreshold,
        });
      }

      return {
        success,
        confidence,
        matchScore,
        error: success ? undefined : {
          code: 'VOICE_VERIFICATION_FAILED',
          message: 'Voice verification did not meet confidence threshold',
          type: 'verification_failed',
        },
      };
    } catch (error) {
      logger.error('Voice verification error', { error });
      return {
        success: false,
        confidence: 0,
        matchScore: 0,
        error: {
          code: 'VOICE_VERIFICATION_ERROR',
          message: 'Voice verification encountered an error',
          type: 'verification_failed',
        },
      };
    }
  }

  /**
   * Record voice sample with user guidance
   */
  async recordVoiceSample(
    prompt: string,
    maxDuration: number = VOICE_AUTH.MAX_RECORDING_DURATION
  ): Promise<Result<VoiceSample>> {
    try {
      if (this.isRecording) {
        return {
          success: false,
          error: {
            code: 'RECORDING_IN_PROGRESS',
            message: 'Another recording is already in progress',
          },
        };
      }

      logger.info('Starting voice sample recording', { maxDuration });

      // Check permissions
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        const granted = await this.requestMicrophonePermission();
        if (!granted) {
          return {
            success: false,
            error: {
              code: 'MICROPHONE_PERMISSION_DENIED',
              message: 'Microphone permission is required',
            },
          };
        }
      }

      // Start recording
      this.isRecording = true;
      this.currentRecordingPath = this.getRecordingPath();
      
      AudioRecorder.prepareRecordingAtPath(this.currentRecordingPath, {
        SampleRate: VOICE_AUTH.SAMPLE_RATE,
        Channels: 1,
        AudioQuality: 'High',
        AudioEncoding: 'aac',
        AudioEncodingBitRate: 32000,
      });

      await AudioRecorder.startRecording();

      // Set recording timeout
      this.recordingTimer = setTimeout(async () => {
        if (this.isRecording) {
          await this.stopRecording();
        }
      }, maxDuration);

      // Return a promise that resolves when recording is complete
      return new Promise((resolve) => {
        const checkRecording = async () => {
          if (!this.isRecording) {
            const sample = await this.createVoiceSample(this.currentRecordingPath!);
            resolve({ success: true, data: sample });
          } else {
            setTimeout(checkRecording, 100);
          }
        };
        checkRecording();
      });
    } catch (error) {
      this.isRecording = false;
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }
      
      logger.error('Voice sample recording failed', { error });
      return {
        success: false,
        error: {
          code: 'VOICE_RECORDING_FAILED',
          message: 'Failed to record voice sample',
          details: error,
        },
      };
    }
  }

  /**
   * Stop current recording
   */
  async stopRecording(): Promise<void> {
    try {
      if (!this.isRecording) {
        return;
      }

      logger.info('Stopping voice recording');

      await AudioRecorder.stopRecording();
      this.isRecording = false;

      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }
    } catch (error) {
      logger.error('Failed to stop recording', { error });
    }
  }

  /**
   * Check if user has enrolled voice authentication
   */
  async isVoiceEnrolled(userId: UserId): Promise<boolean> {
    try {
      const templateResult = await this.getVoiceTemplate(userId);
      return templateResult.success && templateResult.data !== null;
    } catch (error) {
      logger.error('Failed to check voice enrollment status', { error });
      return false;
    }
  }

  /**
   * Update voice template (re-enrollment)
   */
  async updateVoiceTemplate(userId: UserId, request: VoiceEnrollmentRequest): Promise<Result<void>> {
    try {
      // Delete existing template
      await this.deleteVoiceTemplate(userId);
      
      // Enroll new template
      const enrollResult = await this.enrollVoice(request);
      
      if (enrollResult.success) {
        logger.info('Voice template updated successfully', { userId });
        return { success: true, data: undefined };
      } else {
        return {
          success: false,
          error: enrollResult.error,
        };
      }
    } catch (error) {
      logger.error('Failed to update voice template', { error });
      return {
        success: false,
        error: {
          code: 'VOICE_TEMPLATE_UPDATE_FAILED',
          message: 'Failed to update voice template',
          details: error,
        },
      };
    }
  }

  /**
   * Delete voice template
   */
  async deleteVoiceTemplate(userId: UserId): Promise<Result<void>> {
    try {
      await secureStorageService.deleteSecureData(`voice_template_${userId}`);
      logger.info('Voice template deleted', { userId });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to delete voice template', { error });
      return {
        success: false,
        error: {
          code: 'VOICE_TEMPLATE_DELETION_FAILED',
          message: 'Failed to delete voice template',
          details: error,
        },
      };
    }
  }

  // Private helper methods
  private async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return granted;
      } else {
        // iOS - check permission through AudioRecorder
        const permission = await AudioRecorder.requestAuthorization();
        return permission;
      }
    } catch (error) {
      logger.error('Failed to check microphone permission', { error });
      return false;
    }
  }

  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'BoardGuru needs access to your microphone for voice authentication.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const permission = await AudioRecorder.requestAuthorization();
        return permission;
      }
    } catch (error) {
      logger.error('Failed to request microphone permission', { error });
      return false;
    }
  }

  private getRecordingPath(): string {
    const filename = `voice_sample_${Date.now()}.aac`;
    return Platform.OS === 'ios' 
      ? `${AudioUtils.DocumentDirectoryPath}/${filename}`
      : `${RNFS.DocumentDirectoryPath}/${filename}`;
  }

  private async createVoiceSample(filePath: string): Promise<VoiceSample> {
    const fileInfo = await RNFS.stat(filePath);
    const audioData = await RNFS.readFile(filePath, 'base64');
    
    return {
      id: `sample_${Date.now()}`,
      filePath,
      audioData,
      duration: 0, // Would be calculated from audio file
      sampleRate: VOICE_AUTH.SAMPLE_RATE,
      channels: 1,
      bitRate: 32000,
      format: 'aac',
      size: fileInfo.size,
      recordedAt: new Date().toISOString(),
    };
  }

  private generatePassphrase(): string {
    const phrases = [
      'My voice is my passport verify me',
      'BoardGuru secure access authentication',
      'Executive board governance security',
      'Corporate voice identification system',
      'Secure board member authentication',
    ];
    
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  private async extractVoiceFeatures(
    samples: VoiceSample[],
    passphrase: string
  ): Promise<Result<VoiceFeatures>> {
    try {
      // This is a simplified implementation
      // In a real system, this would use advanced signal processing
      
      const features: VoiceFeatures = {
        mfcc: [], // Mel-frequency cepstral coefficients
        pitch: { min: 0, max: 0, mean: 0, std: 0 },
        formants: [], // Formant frequencies
        spectralCentroid: 0,
        spectralRolloff: 0,
        zeroCrossingRate: 0,
        energy: 0,
        voicePrint: [], // Unique voice characteristics
        passphrase,
        extractedAt: new Date().toISOString(),
      };

      // TODO: Implement actual feature extraction using signal processing libraries
      // This would involve FFT, MFCC calculation, pitch detection, etc.
      
      return { success: true, data: features };
    } catch (error) {
      logger.error('Voice feature extraction failed', { error });
      return {
        success: false,
        error: {
          code: 'FEATURE_EXTRACTION_FAILED',
          message: 'Failed to extract voice features',
          details: error,
        },
      };
    }
  }

  private compareVoiceFeatures(template: VoiceFeatures, sample: VoiceFeatures): number {
    // This is a simplified comparison
    // In a real system, this would use sophisticated pattern matching algorithms
    
    let score = 0;
    let comparisons = 0;

    // Compare MFCC coefficients
    if (template.mfcc.length === sample.mfcc.length) {
      const mfccSimilarity = this.calculateCosineSimilarity(template.mfcc, sample.mfcc);
      score += mfccSimilarity * 0.4;
      comparisons++;
    }

    // Compare pitch characteristics
    const pitchSimilarity = this.comparePitchFeatures(template.pitch, sample.pitch);
    score += pitchSimilarity * 0.2;
    comparisons++;

    // Compare formants
    if (template.formants.length === sample.formants.length) {
      const formantSimilarity = this.calculateCosineSimilarity(template.formants, sample.formants);
      score += formantSimilarity * 0.2;
      comparisons++;
    }

    // Compare spectral features
    const spectralSimilarity = Math.max(0, 1 - Math.abs(
      template.spectralCentroid - sample.spectralCentroid
    ) / Math.max(template.spectralCentroid, sample.spectralCentroid));
    score += spectralSimilarity * 0.1;
    comparisons++;

    // Compare voice print
    if (template.voicePrint.length === sample.voicePrint.length) {
      const voicePrintSimilarity = this.calculateCosineSimilarity(
        template.voicePrint, 
        sample.voicePrint
      );
      score += voicePrintSimilarity * 0.1;
      comparisons++;
    }

    return comparisons > 0 ? score / comparisons : 0;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private comparePitchFeatures(a: VoiceFeatures['pitch'], b: VoiceFeatures['pitch']): number {
    const meanSimilarity = Math.max(0, 1 - Math.abs(a.mean - b.mean) / Math.max(a.mean, b.mean));
    const rangeSimilarity = Math.max(0, 1 - Math.abs((a.max - a.min) - (b.max - b.min)) / 
      Math.max((a.max - a.min), (b.max - b.min)));
    
    return (meanSimilarity + rangeSimilarity) / 2;
  }

  private calculateTemplateQuality(samples: VoiceSample[]): number {
    // Calculate quality based on sample consistency, audio quality, etc.
    // This is simplified - real implementation would analyze audio characteristics
    return Math.random() * 0.3 + 0.7; // Return value between 0.7 and 1.0
  }

  private calculateConfidence(matchScore: number, templateQuality: number): number {
    // Combine match score with template quality to get confidence
    return matchScore * templateQuality;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async cleanupSampleFiles(samples: VoiceSample[]): Promise<void> {
    try {
      for (const sample of samples) {
        if (await RNFS.exists(sample.filePath)) {
          await RNFS.unlink(sample.filePath);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup sample files', { error });
    }
  }

  // Storage methods
  private async storeVoiceTemplate(template: VoiceTemplate): Promise<void> {
    await secureStorageService.storeSecureData(`voice_template_${template.userId}`, template);
  }

  private async getVoiceTemplate(userId: UserId): Promise<Result<VoiceTemplate | null>> {
    return secureStorageService.getSecureData(`voice_template_${userId}`);
  }

  private async updateTemplateUsage(userId: UserId): Promise<void> {
    try {
      const templateResult = await this.getVoiceTemplate(userId);
      if (templateResult.success && templateResult.data) {
        const updatedTemplate = {
          ...templateResult.data,
          lastUsed: new Date().toISOString(),
          usageCount: templateResult.data.usageCount + 1,
        };
        await this.storeVoiceTemplate(updatedTemplate);
      }
    } catch (error) {
      logger.warn('Failed to update template usage', { error });
    }
  }
}

export const voiceAuthenticationService = new VoiceAuthenticationService();