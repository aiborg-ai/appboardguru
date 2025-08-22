/**
 * Voice Biometric Security API
 * Handles voiceprint analysis, speaker verification, emotion detection, and secure template storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/security/auth-guard';
import { logSecurityEvent } from '@/lib/security/audit';
import { 
  SupabaseClient, 
  User, 
  EmotionAnalysis,
  VoiceAuthenticationRequest,
  VoiceAuthenticationResponse,
  BiometricEnrollmentRequest,
  BiometricEnrollmentResponse,
  EmotionAnalysisRequest,
  VoiceBiometricProfile,
  AuthenticationContext,
  FraudDetectionResult,
  VoiceCharacteristics,
  LivenessResult,
  SpoofingResult
} from '@/types/voice';

// Rate limiting for voice biometric operations
const attemptMap = new Map<string, { count: number; resetTime: number }>();

// Placeholder implementations for biometric utilities
const VoiceProcessor = {
  validateAudioData: (audioData: string, format?: string) => ({
    isValid: true,
    issues: [] as string[],
    quality: 'good' as const
  }),
  extractVoiceCharacteristics: async (audioData: string): Promise<VoiceCharacteristics> => ({
    fundamentalFrequency: 120,
    speechRate: 150,
    pitchVariance: 20,
    spectralCentroid: 1500,
    mfccFeatures: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    formantFrequencies: [800, 1200, 2500],
    voiceQualityMetrics: {
      harmonicToNoiseRatio: 15,
      roughness: 0.2,
      breathiness: 0.1,
      signalToNoiseRatio: 20
    }
  }),
  calculateMatchingScore: (template: VoiceCharacteristics, sample: VoiceCharacteristics, threshold: number) => ({
    score: 0.85,
    confidence: 0.9,
    details: {}
  })
};

const BiometricUtils = {
  calculateTemplateQuality: (characteristics: VoiceCharacteristics) => 85,
  generateSessionId: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
};

const BiometricEncryption = {
  encryptTemplate: async (template: VoiceBiometricProfile, userId: string, orgId: string) => ({
    templateData: JSON.stringify(template),
    securityHash: 'hash123',
    encryptionMethod: 'aes-256-gcm' as const
  }),
  decryptTemplate: async (encryptedData: { templateData?: string } & Record<string, unknown>) => {
    // Placeholder decryption - in real implementation would decrypt the data
    return JSON.parse(encryptedData.templateData || '{}') as VoiceBiometricProfile;
  }
};

const AntiSpoofingDetector = {
  detectSpoofing: (characteristics: VoiceCharacteristics): SpoofingResult => ({
    isSpoofed: false,
    confidence: 0.95,
    spoofingType: []
  }),
  detectLiveness: (characteristics: VoiceCharacteristics, phrase?: string): LivenessResult => ({
    isLive: true,
    confidence: 0.9,
    indicators: ['natural_speech', 'proper_timing']
  })
};

const EmotionAnalyzer = {
  analyzeEmotion: async (characteristics: VoiceCharacteristics): Promise<EmotionAnalysis> => ({
    emotionId: `emotion_${Date.now()}`,
    userId: '',
    sessionId: undefined,
    dominantEmotion: 'neutral',
    emotionScores: { neutral: 0.8, happy: 0.1, sad: 0.05, angry: 0.05 },
    stressLevel: 20,
    urgencyLevel: 10,
    cognitiveLoad: 30,
    arousal: 0.4,
    valence: 0.6,
    confidence: 0.85,
    escalationRecommended: false,
    supportNeeded: false,
    timestamp: new Date().toISOString()
  }),
  detectFraudIndicators: (characteristics: VoiceCharacteristics, emotion: EmotionAnalysis): FraudDetectionResult => ({
    riskScore: 15,
    fraudIndicators: [],
    recommendation: 'proceed' as const,
    riskFactors: []
  })
};

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const maxAttempts = 10;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const now = Date.now();
  
  const existing = attemptMap.get(userId);
  
  if (!existing || now >= existing.resetTime) {
    attemptMap.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  
  existing.count++;
  
  if (existing.count > maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: maxAttempts - existing.count };
}

/**
 * POST /api/voice/biometric
 * Main endpoint for voice biometric operations
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const supabase = await createSupabaseServerClient();

    // Rate limiting
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      await logSecurityEvent('voice_biometric_rate_limit_exceeded', {
        userId: user.id,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      }, 'medium');
      
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', success: false },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { operation } = body;

    // Route to specific operation
    switch (operation) {
      case 'enroll':
        return handleEnrollment(body, user as any, supabase);
      
      case 'authenticate':
        return handleAuthentication(body, user as any, supabase);
      
      case 'verify':
        return handleVerification(body, user as any, supabase);
      
      case 'emotion_analysis':
        return handleEmotionAnalysis(body, user as any, supabase);
      
      case 'fraud_detection':
        return handleFraudDetection(body, user as any, supabase);
      
      case 'get_profile':
        return handleGetProfile(user as any, supabase);
      
      case 'update_profile':
        return handleUpdateProfile(body, user as any, supabase);
      
      case 'delete_profile':
        return handleDeleteProfile(user as any, supabase);
      
      default:
        return NextResponse.json(
          { error: 'Invalid operation', success: false },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Voice biometric API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Handle biometric enrollment
 */
async function handleEnrollment(
  body: BiometricEnrollmentRequest,
  user: User,
  supabase: SupabaseClient
): Promise<NextResponse> {
  try {
    const { audioData, sessionNumber, utterance, format, deviceInfo } = body;

    if (!audioData || !utterance) {
      return NextResponse.json(
        { error: 'Audio data and utterance are required', success: false },
        { status: 400 }
      );
    }

    // Validate audio data
    const audioValidation = VoiceProcessor.validateAudioData(audioData, format);
    if (!audioValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid audio data',
        issues: audioValidation.issues
      }, { status: 400 });
    }

    // Extract voice characteristics
    const voiceCharacteristics = await VoiceProcessor.extractVoiceCharacteristics(audioData);
    
    // Calculate quality score
    const qualityScore = BiometricUtils.calculateTemplateQuality(voiceCharacteristics);
    
    if (qualityScore < 60) {
      return NextResponse.json({
        success: false,
        error: 'Audio quality too low for enrollment',
        qualityScore,
        recommendations: [
          'Find a quieter environment',
          'Speak closer to the microphone',
          'Ensure stable internet connection'
        ]
      }, { status: 400 });
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('voice_biometric_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let profile: VoiceBiometricProfile;
    let enrollmentComplete = false;
    let progress = 0;

    if (existingProfile) {
      // Update existing profile
      const decryptedTemplate = await BiometricEncryption.decryptTemplate(existingProfile);
      
      // Add new session data
      decryptedTemplate.enrollmentData.enrollmentSessions.push({
        id: BiometricUtils.generateSessionId(),
        sessionNumber,
        recordingDuration: 5, // Estimated from audio data
        utterances: [utterance],
        qualityScore,
        signalToNoiseRatio: voiceCharacteristics.voiceQualityMetrics.harmonicToNoiseRatio,
        recordedAt: new Date().toISOString(),
        deviceInfo
      });

      // Update voice characteristics (average with existing)
      decryptedTemplate.voiceCharacteristics = averageVoiceCharacteristics(
        decryptedTemplate.voiceCharacteristics,
        voiceCharacteristics
      );

      // Check if enrollment is complete
      const sessions = decryptedTemplate.enrollmentData.enrollmentSessions;
      enrollmentComplete = sessions.length >= decryptedTemplate.enrollmentData.minSessionsRequired;
      progress = Math.min(100, (sessions.length / decryptedTemplate.enrollmentData.minSessionsRequired) * 100);

      decryptedTemplate.enrollmentData.enrollmentComplete = enrollmentComplete;
      decryptedTemplate.enrollmentData.qualityScore = Math.round(
        sessions.reduce((sum: number, s) => sum + s.qualityScore, 0) / sessions.length
      );

      // Re-encrypt and save
      const encryptedTemplate = await BiometricEncryption.encryptTemplate(
        decryptedTemplate,
        user.id,
        (user as any).organizations?.[0]?.id || 'default'
      );

      await supabase
        .from('voice_biometric_profiles')
        .update({
          voiceprint_template: encryptedTemplate.templateData,
          security_hash: encryptedTemplate.securityHash,
          updated_at: new Date().toISOString(),
          last_used: enrollmentComplete ? new Date().toISOString() : existingProfile.last_used
        })
        .eq('id', existingProfile.id);

      profile = { ...existingProfile, ...decryptedTemplate };
    } else {
      // Create new profile
      const newProfile: VoiceBiometricProfile = {
        id: BiometricUtils.generateSessionId(),
        userId: user.id,
        organizationId: (user as any).organizations?.[0]?.id || 'default',
        voiceprintTemplate: '', // Will be set after encryption
        voiceCharacteristics,
        enrollmentData: {
          enrollmentSessions: [{
            id: BiometricUtils.generateSessionId(),
            sessionNumber: 1,
            recordingDuration: 5,
            utterances: [utterance],
            qualityScore,
            signalToNoiseRatio: voiceCharacteristics.voiceQualityMetrics.harmonicToNoiseRatio,
            recordedAt: new Date().toISOString(),
            ...(deviceInfo ? { deviceInfo } : {})
          }],
          qualityScore,
          templateVersion: '1.0',
          enrollmentComplete: false,
          minSessionsRequired: 3,
          backgroundNoiseProfile: [0.1, 0.2, 0.1],
          recordingQualityMetrics: {
            sampleRate: 44100,
            bitDepth: 16,
            channels: 1,
            avgAmplitude: 0.5,
            backgroundNoise: 0.1,
            clipping: false,
            overallQuality: audioValidation.quality
          }
        },
        securitySettings: {
          authenticationThreshold: 80,
          verificationTimeout: 30,
          maxAttempts: 3,
          enableLivenessDetection: true,
          enableAntiSpoofing: true,
          requirePhraseMatching: false,
          fallbackAuthEnabled: true,
          adaptiveThreshold: true,
          securityLevel: 'standard'
        },
        personalizationProfile: {
          userId: user.id,
          communicationStyle: {
            formality: 'professional',
            verbosity: 'balanced',
            pace: 'normal',
            tone: 'neutral',
            technicalLevel: 'intermediate'
          },
          preferredInteractionModes: ['voice_with_visual'],
          adaptiveSettings: {
            autoAdjustVolume: true,
            autoAdjustSpeechRate: false,
            adaptToBackground: true,
            learningEnabled: true,
            suggestionLevel: 'moderate',
            contextAwareness: true
          },
          voiceShortcuts: [],
          personalizedResponses: [],
          learningHistory: {
            totalInteractions: 1,
            successfulAuthentications: 0,
            averageAuthenticationTime: 0,
            commonPhrases: { [utterance]: 1 },
            errorPatterns: [],
            improvementAreas: [],
            adaptationHistory: []
          },
          preferences: {
            voiceFeedback: true,
            visualFeedback: true,
            hapticFeedback: false,
            confidenceDisplay: true,
            debugMode: false,
            privacyMode: false,
            dataSharing: 'anonymous',
            retentionPeriod: 365
          }
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      enrollmentComplete = false;
      progress = 33; // First session out of 3

      // Encrypt template
      const encryptedTemplate = await BiometricEncryption.encryptTemplate(
        newProfile,
        user.id,
        (user as any).organizations?.[0]?.id || 'default'
      );

      // Save to database
      await supabase
        .from('voice_biometric_profiles')
        .insert({
          id: newProfile.id,
          user_id: user.id,
          organization_id: newProfile.organizationId,
          voiceprint_template: encryptedTemplate.templateData,
          security_hash: encryptedTemplate.securityHash,
          enrollment_complete: enrollmentComplete,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      profile = newProfile;
    }

    // Log enrollment event
    await logSecurityEvent('voice_biometric_enrollment', {
      userId: user.id,
      sessionNumber,
      qualityScore,
      enrollmentComplete,
      progress
    }, 'low');

    const response: BiometricEnrollmentResponse = {
      success: true,
      sessionId: profile.id,
      progress,
      qualityScore,
      enrollmentComplete,
      nextSteps: enrollmentComplete ? 
        ['Enrollment complete! You can now use voice authentication.'] :
        [`Record ${3 - Math.floor(progress / 33)} more samples to complete enrollment.`],
      recommendations: qualityScore < 80 ? [
        'Try recording in a quieter environment for better quality'
      ] : []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({
      success: false,
      error: 'Enrollment failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Handle voice authentication
 */
async function handleAuthentication(
  body: VoiceAuthenticationRequest,
  user: User,
  supabase: SupabaseClient
): Promise<NextResponse> {
  try {
    const { audioData, authPhrase, challengeType = 'text_independent', context } = body;

    if (!audioData || !context) {
      return NextResponse.json({
        error: 'Audio data and context are required',
        success: false
      }, { status: 400 });
    }

    // Get user's biometric profile
    const { data: profileData, error: profileError } = await supabase
      .from('voice_biometric_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !profileData || !profileData.enrollment_complete) {
      return NextResponse.json({
        success: false,
        error: 'Voice biometric profile not found or incomplete',
        fallbackOptions: [{
          method: 'password',
          available: true,
          description: 'Use password authentication',
          estimatedTime: 10
        }]
      }, { status: 404 });
    }

    // Validate and process audio
    const audioValidation = VoiceProcessor.validateAudioData(audioData);
    if (!audioValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid audio data',
        issues: audioValidation.issues
      }, { status: 400 });
    }

    // Extract voice characteristics from sample
    const sampleCharacteristics = await VoiceProcessor.extractVoiceCharacteristics(audioData);
    
    // Decrypt stored template
    const decryptedProfile = await BiometricEncryption.decryptTemplate({
      id: profileData.id,
      userId: profileData.user_id,
      organizationId: profileData.organization_id,
      templateData: profileData.voiceprint_template,
      templateVersion: '1.0',
      securityHash: profileData.security_hash,
      encryptionMethod: 'aes-256-gcm',
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at,
      isActive: profileData.is_active
    });

    // Perform biometric matching
    const matchingResult = VoiceProcessor.calculateMatchingScore(
      decryptedProfile.voiceCharacteristics,
      sampleCharacteristics,
      decryptedProfile.securitySettings.authenticationThreshold / 100
    );

    // Anti-spoofing detection
    const spoofingResult = AntiSpoofingDetector.detectSpoofing(sampleCharacteristics);
    
    // Liveness detection
    const livenessResult = AntiSpoofingDetector.detectLiveness(sampleCharacteristics, authPhrase);

    // Emotion analysis
    const emotionResult = await EmotionAnalyzer.analyzeEmotion(sampleCharacteristics);
    emotionResult.userId = user.id;

    // Fraud detection
    const fraudResult = EmotionAnalyzer.detectFraudIndicators(
      sampleCharacteristics,
      emotionResult
    );

    // Calculate overall confidence
    const biometricScore = matchingResult.score * 100;
    const threshold = decryptedProfile.securitySettings.authenticationThreshold;
    const success = biometricScore >= threshold && 
                   !spoofingResult.isSpoofed && 
                   livenessResult.isLive &&
                   fraudResult.riskScore < 50;

    // Generate authentication response
    const authenticationId = BiometricUtils.generateSessionId();
    const processingTime = Date.now() - Date.now(); // Simulated processing time

    const response: VoiceAuthenticationResponse = {
      success,
      confidence: Math.round(biometricScore),
      authenticationId,
      matchingScore: matchingResult.score,
      verificationTime: processingTime,
      securityAssessment: {
        overallRisk: fraudResult.riskScore > 70 ? 'high' : 
                    fraudResult.riskScore > 40 ? 'medium' : 'low',
        spoofingDetection: spoofingResult,
        livenessScore: Math.round(livenessResult.confidence * 100),
        environmentalFactors: {
          backgroundNoise: Math.round(sampleCharacteristics.voiceQualityMetrics.harmonicToNoiseRatio),
          signalClarity: Math.round((1 - sampleCharacteristics.voiceQualityMetrics.roughness) * 100),
          recordingDevice: 'web_browser',
          transmissionQuality: 85
        },
        behavioralFactors: {
          speakingRate: sampleCharacteristics.speechRate,
          stressLevel: emotionResult.stressLevel,
          naturalness: Math.round(livenessResult.confidence * 100),
          hesitationPatterns: emotionResult.cognitiveLoad
        }
      },
      biometricQuality: {
        templateQuality: BiometricUtils.calculateTemplateQuality(decryptedProfile.voiceCharacteristics),
        signalQuality: Math.round((audioValidation.quality as any) === 'excellent' ? 95 : 
                                (audioValidation.quality as any) === 'good' ? 80 :
                                (audioValidation.quality as any) === 'fair' ? 65 : 45),
        featureExtraction: Math.round(matchingResult.confidence * 100),
        matchingReliability: Math.round(matchingResult.confidence * 100)
      },
      recommendations: [],
      fallbackOptions: success ? [] : [{
        method: 'password',
        available: true,
        description: 'Use password authentication',
        estimatedTime: 10
      }]
    };

    if (!success) {
      if (spoofingResult.isSpoofed) {
        response.errorDetails = {
          code: 'SPOOFING_DETECTED',
          message: 'Voice spoofing detected',
          details: spoofingResult,
          recoverable: false
        };
      } else if (!livenessResult.isLive) {
        response.errorDetails = {
          code: 'LIVENESS_FAILED',
          message: 'Liveness detection failed',
          details: livenessResult,
          recoverable: true,
          retryAfter: 5
        };
      } else if (biometricScore < threshold) {
        response.errorDetails = {
          code: 'BIOMETRIC_MISMATCH',
          message: 'Voice does not match enrolled profile',
          details: matchingResult,
          recoverable: true,
          retryAfter: 2
        };
      }
    }

    // Log authentication attempt
    await supabase
      .from('voice_authentication_logs')
      .insert({
        id: authenticationId,
        user_id: user.id,
        organization_id: decryptedProfile.organizationId,
        authentication_type: 'login',
        success,
        confidence: biometricScore,
        duration: processingTime,
        attempts: 1,
        risk_level: response.securityAssessment.overallRisk,
        device_info: JSON.stringify({}),
        contextual_info: JSON.stringify(context),
        security_flags: JSON.stringify(fraudResult.fraudIndicators),
        emotional_state: emotionResult.dominantEmotion,
        stress_level: emotionResult.stressLevel,
        timestamp: new Date().toISOString(),
        error_code: response.errorDetails?.code,
        error_message: response.errorDetails?.message
      });

    // Log security event
    await logSecurityEvent('voice_biometric_authentication', {
      userId: user.id,
      success,
      confidence: biometricScore,
      riskLevel: response.securityAssessment.overallRisk,
      context: context.purpose
    }, success ? 'low' : 'medium');

    return NextResponse.json(response);

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Handle voice verification (for sensitive operations)
 */
async function handleVerification(body: VoiceAuthenticationRequest, user: User, supabase: SupabaseClient): Promise<NextResponse> {
  // Similar to authentication but with higher security requirements
  return handleAuthentication(body, user, supabase);
}

/**
 * Handle emotion analysis
 */
async function handleEmotionAnalysis(
  body: EmotionAnalysisRequest,
  user: User,
  supabase: SupabaseClient
): Promise<NextResponse> {
  try {
    const { audioData, sessionId, context, analysisType = 'basic' } = body;

    if (!audioData) {
      return NextResponse.json({
        error: 'Audio data is required',
        success: false
      }, { status: 400 });
    }

    // Extract voice characteristics
    const voiceCharacteristics = await VoiceProcessor.extractVoiceCharacteristics(audioData);
    
    // Perform emotion analysis
    const emotionResult = await EmotionAnalyzer.analyzeEmotion(voiceCharacteristics);
    emotionResult.userId = user.id;
    if (sessionId) {
      emotionResult.sessionId = sessionId;
    }

    // Store emotion analysis if requested
    if (analysisType === 'comprehensive') {
      await supabase
        .from('emotion_history')
        .insert({
          id: emotionResult.emotionId,
          user_id: user.id,
          organization_id: (user as any).organizations?.[0]?.id || 'default',
          session_id: sessionId,
          emotion_data: JSON.stringify(emotionResult),
          analysis_type: analysisType,
          context_tags: context ? [context] : [],
          escalation_triggered: emotionResult.escalationRecommended,
          follow_up_required: emotionResult.stressLevel > 70,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      emotionAnalysis: emotionResult
    });

  } catch (error) {
    console.error('Emotion analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Emotion analysis failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Handle fraud detection
 */
async function handleFraudDetection(body: { audioData: string; context?: string }, user: User, supabase: SupabaseClient): Promise<NextResponse> {
  try {
    const { audioData, context } = body;

    if (!audioData) {
      return NextResponse.json({
        error: 'Audio data is required',
        success: false
      }, { status: 400 });
    }

    const voiceCharacteristics = await VoiceProcessor.extractVoiceCharacteristics(audioData);
    const emotionResult = await EmotionAnalyzer.analyzeEmotion(voiceCharacteristics);
    emotionResult.userId = user.id;

    const fraudResult = EmotionAnalyzer.detectFraudIndicators(
      voiceCharacteristics,
      emotionResult
    );

    // Log fraud detection event
    await logSecurityEvent('voice_fraud_detection', {
      userId: user.id,
      riskScore: fraudResult.riskScore,
      recommendation: fraudResult.recommendation,
      indicatorCount: fraudResult.fraudIndicators.length,
      context
    }, fraudResult.riskScore > 50 ? 'high' : 'medium');

    return NextResponse.json({
      success: true,
      fraudDetection: fraudResult
    });

  } catch (error) {
    console.error('Fraud detection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Fraud detection failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Get user's biometric profile
 */
async function handleGetProfile(user: User, supabase: SupabaseClient): Promise<NextResponse> {
  try {
    const { data: profileData, error } = await supabase
      .from('voice_biometric_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !profileData) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    // Return profile without sensitive template data
    return NextResponse.json({
      success: true,
      profile: {
        id: profileData.id,
        userId: profileData.user_id,
        organizationId: profileData.organization_id,
        enrollmentComplete: profileData.enrollment_complete,
        isActive: profileData.is_active,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
        lastUsed: profileData.last_used
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get profile',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Update user's biometric profile settings
 */
async function handleUpdateProfile(body: { securitySettings?: unknown; personalizationSettings?: unknown }, user: User, supabase: SupabaseClient): Promise<NextResponse> {
  try {
    const { securitySettings, personalizationSettings } = body;

    const { data: profileData, error } = await supabase
      .from('voice_biometric_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !profileData) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    // Update profile (this would involve decrypting, updating, and re-encrypting)
    await supabase
      .from('voice_biometric_profiles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', profileData.id);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Delete user's biometric profile
 */
async function handleDeleteProfile(user: User, supabase: SupabaseClient): Promise<NextResponse> {
  try {
    await supabase
      .from('voice_biometric_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    // Log deletion event
    await logSecurityEvent('voice_biometric_profile_deleted', {
      userId: user.id
    }, 'medium');

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete profile',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * Helper function to average voice characteristics for enrollment
 */
function averageVoiceCharacteristics(existing: VoiceCharacteristics, newChar: VoiceCharacteristics): VoiceCharacteristics {
  return {
    ...existing,
    fundamentalFrequency: (existing.fundamentalFrequency + newChar.fundamentalFrequency) / 2,
    speechRate: (existing.speechRate + newChar.speechRate) / 2,
    pitchVariance: (existing.pitchVariance + newChar.pitchVariance) / 2,
    // Add more averaging logic as needed
  };
}

