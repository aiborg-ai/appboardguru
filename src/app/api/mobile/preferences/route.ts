/**
 * Mobile Preferences API Endpoint
 * Manages mobile-specific user preferences and optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface MobilePreferences {
  dataUsageMode: 'MINIMAL' | 'BALANCED' | 'FULL';
  syncFrequency: 'REAL_TIME' | 'EVERY_5_MINUTES' | 'EVERY_15_MINUTES' | 'EVERY_HOUR' | 'MANUAL_ONLY';
  offlineMode: boolean;
  compressionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  autoDownloadThreshold: number;
  wifiOnlyUploads: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
  biometricAuth: boolean;
  hapticFeedback: boolean;
  darkModeAuto: boolean;
  reducedMotion: boolean;
  textSize: 'small' | 'medium' | 'large' | 'extra-large';
  imageQuality: 'low' | 'medium' | 'high' | 'original';
  videoAutoplay: boolean;
  locationServices: boolean;
}

const defaultPreferences: MobilePreferences = {
  dataUsageMode: 'BALANCED',
  syncFrequency: 'EVERY_15_MINUTES',
  offlineMode: false,
  compressionLevel: 'MEDIUM',
  autoDownloadThreshold: 10 * 1024 * 1024, // 10MB
  wifiOnlyUploads: true,
  backgroundSync: true,
  pushNotifications: true,
  biometricAuth: false,
  hapticFeedback: true,
  darkModeAuto: true,
  reducedMotion: false,
  textSize: 'medium',
  imageQuality: 'medium',
  videoAutoplay: false,
  locationServices: false,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Verify user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || user.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's mobile preferences
    const { data, error } = await supabase
      .from('users')
      .select('mobile_preferences, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    const preferences = { ...defaultPreferences, ...data.mobile_preferences };
    
    // Generate device-specific recommendations
    const deviceInfo = extractDeviceInfo(request);
    const recommendations = generateDeviceRecommendations(deviceInfo, preferences);

    return NextResponse.json({
      preferences,
      recommendations,
      deviceInfo,
      lastUpdated: data.mobile_preferences?.lastUpdated || data.created_at,
    });

  } catch (error) {
    console.error('Mobile preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get mobile preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, preferences, deviceInfo } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Verify user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || user.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate preferences
    const validatedPreferences = validatePreferences(preferences);
    
    // Apply device-specific optimizations
    const optimizedPreferences = applyDeviceOptimizations(validatedPreferences, deviceInfo);

    // Update preferences in database
    const { data, error } = await supabase
      .from('users')
      .update({
        mobile_preferences: {
          ...optimizedPreferences,
          lastUpdated: new Date().toISOString(),
          deviceInfo,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('mobile_preferences')
      .single();

    if (error) {
      throw error;
    }

    // Generate performance impact analysis
    const impact = analyzePerformanceImpact(optimizedPreferences, deviceInfo);

    return NextResponse.json({
      success: true,
      preferences: data.mobile_preferences,
      impact,
      message: 'Mobile preferences updated successfully',
    });

  } catch (error) {
    console.error('Mobile preferences update error:', error);
    return NextResponse.json(
      { error: 'Failed to update mobile preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, setting, value } = await request.json();

    if (!userId || !setting) {
      return NextResponse.json(
        { error: 'User ID and setting are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get current preferences
    const { data: currentData } = await supabase
      .from('users')
      .select('mobile_preferences')
      .eq('id', userId)
      .single();

    const currentPreferences = { ...defaultPreferences, ...currentData?.mobile_preferences };
    
    // Update single setting
    const updatedPreferences = {
      ...currentPreferences,
      [setting]: value,
      lastUpdated: new Date().toISOString(),
    };

    // Update in database
    const { data, error } = await supabase
      .from('users')
      .update({
        mobile_preferences: updatedPreferences,
      })
      .eq('id', userId)
      .select('mobile_preferences')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      setting,
      value,
      preferences: data.mobile_preferences,
      message: `${setting} updated successfully`,
    });

  } catch (error) {
    console.error('Mobile preference setting update error:', error);
    return NextResponse.json(
      { error: 'Failed to update preference setting' },
      { status: 500 }
    );
  }
}

// Reset preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Reset to default preferences
    const { data, error } = await supabase
      .from('users')
      .update({
        mobile_preferences: {
          ...defaultPreferences,
          lastUpdated: new Date().toISOString(),
        },
      })
      .eq('id', userId)
      .select('mobile_preferences')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      preferences: data.mobile_preferences,
      message: 'Mobile preferences reset to defaults',
    });

  } catch (error) {
    console.error('Mobile preferences reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset mobile preferences' },
      { status: 500 }
    );
  }
}

/**
 * Extract device information from request headers
 */
function extractDeviceInfo(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  return {
    platform: getPlatform(userAgent),
    browser: getBrowser(userAgent),
    screenSize: request.headers.get('sec-ch-viewport-width') || 'unknown',
    deviceMemory: request.headers.get('device-memory') || 'unknown',
    networkType: request.headers.get('connection-type') || 'unknown',
    effectiveType: request.headers.get('effective-type') || '4g',
    saveData: request.headers.get('save-data') === 'on',
  };
}

/**
 * Generate device-specific recommendations
 */
function generateDeviceRecommendations(deviceInfo: any, preferences: MobilePreferences): string[] {
  const recommendations: string[] = [];

  // Memory-based recommendations
  if (deviceInfo.deviceMemory && parseInt(deviceInfo.deviceMemory) < 4) {
    recommendations.push(
      'Consider enabling reduced motion for better performance',
      'Use smaller text size to fit more content on screen',
      'Enable higher compression levels to reduce memory usage'
    );
  }

  // Network-based recommendations
  if (deviceInfo.saveData || deviceInfo.effectiveType === '2g' || deviceInfo.effectiveType === '3g') {
    recommendations.push(
      'Enable MINIMAL data usage mode for better performance',
      'Turn off video autoplay to save data',
      'Use WiFi-only uploads to avoid cellular data charges'
    );
  }

  // Platform-specific recommendations
  if (deviceInfo.platform === 'iOS') {
    recommendations.push(
      'Enable biometric authentication for better security',
      'Use haptic feedback for better user experience'
    );
  } else if (deviceInfo.platform === 'Android') {
    recommendations.push(
      'Enable background sync for better offline experience',
      'Consider location services for context-aware features'
    );
  }

  // Based on current settings
  if (!preferences.offlineMode && deviceInfo.networkType === 'cellular') {
    recommendations.push(
      'Enable offline mode to reduce cellular data usage'
    );
  }

  if (preferences.compressionLevel === 'NONE' && deviceInfo.effectiveType !== '5g') {
    recommendations.push(
      'Enable compression to improve loading times'
    );
  }

  return recommendations;
}

/**
 * Validate preferences object
 */
function validatePreferences(preferences: Partial<MobilePreferences>): MobilePreferences {
  const validated = { ...defaultPreferences };

  // Validate each preference with type checking and allowed values
  Object.keys(preferences).forEach(key => {
    const value = preferences[key as keyof MobilePreferences];
    
    switch (key) {
      case 'dataUsageMode':
        if (['MINIMAL', 'BALANCED', 'FULL'].includes(value as string)) {
          validated.dataUsageMode = value as any;
        }
        break;
        
      case 'syncFrequency':
        if (['REAL_TIME', 'EVERY_5_MINUTES', 'EVERY_15_MINUTES', 'EVERY_HOUR', 'MANUAL_ONLY'].includes(value as string)) {
          validated.syncFrequency = value as any;
        }
        break;
        
      case 'compressionLevel':
        if (['NONE', 'LOW', 'MEDIUM', 'HIGH', 'MAXIMUM'].includes(value as string)) {
          validated.compressionLevel = value as any;
        }
        break;
        
      case 'autoDownloadThreshold':
        if (typeof value === 'number' && value >= 0 && value <= 100 * 1024 * 1024) {
          validated.autoDownloadThreshold = value;
        }
        break;
        
      case 'textSize':
        if (['small', 'medium', 'large', 'extra-large'].includes(value as string)) {
          validated.textSize = value as any;
        }
        break;
        
      case 'imageQuality':
        if (['low', 'medium', 'high', 'original'].includes(value as string)) {
          validated.imageQuality = value as any;
        }
        break;
        
      default:
        if (typeof value === 'boolean') {
          (validated as any)[key] = value;
        }
    }
  });

  return validated;
}

/**
 * Apply device-specific optimizations to preferences
 */
function applyDeviceOptimizations(preferences: MobilePreferences, deviceInfo?: any): MobilePreferences {
  const optimized = { ...preferences };

  if (deviceInfo) {
    // Low memory devices
    if (deviceInfo.deviceMemory && parseInt(deviceInfo.deviceMemory) < 2) {
      optimized.compressionLevel = 'MAXIMUM';
      optimized.imageQuality = 'low';
      optimized.reducedMotion = true;
    }

    // Slow networks
    if (deviceInfo.effectiveType === '2g' || deviceInfo.effectiveType === 'slow-2g') {
      optimized.dataUsageMode = 'MINIMAL';
      optimized.syncFrequency = 'MANUAL_ONLY';
      optimized.videoAutoplay = false;
      optimized.compressionLevel = 'MAXIMUM';
    }

    // Save-data mode
    if (deviceInfo.saveData) {
      optimized.dataUsageMode = 'MINIMAL';
      optimized.imageQuality = 'low';
      optimized.compressionLevel = 'MAXIMUM';
      optimized.videoAutoplay = false;
    }

    // Cellular connections
    if (deviceInfo.networkType === 'cellular') {
      optimized.wifiOnlyUploads = true;
      optimized.backgroundSync = false;
    }
  }

  return optimized;
}

/**
 * Analyze performance impact of preference changes
 */
function analyzePerformanceImpact(preferences: MobilePreferences, deviceInfo?: any): {
  dataUsage: 'reduced' | 'normal' | 'increased';
  batteryLife: 'improved' | 'normal' | 'reduced';
  performance: 'improved' | 'normal' | 'reduced';
  userExperience: 'improved' | 'normal' | 'reduced';
  recommendations: string[];
} {
  const impact = {
    dataUsage: 'normal' as const,
    batteryLife: 'normal' as const,
    performance: 'normal' as const,
    userExperience: 'normal' as const,
    recommendations: [] as string[],
  };

  // Analyze data usage impact
  if (preferences.dataUsageMode === 'MINIMAL' || preferences.compressionLevel === 'MAXIMUM') {
    impact.dataUsage = 'reduced';
    impact.recommendations.push('Data usage will be significantly reduced');
  } else if (preferences.dataUsageMode === 'FULL' && preferences.imageQuality === 'original') {
    impact.dataUsage = 'increased';
    impact.recommendations.push('Data usage will be higher with these settings');
  }

  // Analyze battery life impact
  if (preferences.backgroundSync && preferences.syncFrequency === 'REAL_TIME') {
    impact.batteryLife = 'reduced';
    impact.recommendations.push('Real-time sync may reduce battery life');
  } else if (preferences.offlineMode || preferences.syncFrequency === 'MANUAL_ONLY') {
    impact.batteryLife = 'improved';
    impact.recommendations.push('Battery life will be improved with reduced sync');
  }

  // Analyze performance impact
  if (preferences.reducedMotion && preferences.compressionLevel === 'MAXIMUM') {
    impact.performance = 'improved';
    impact.recommendations.push('App performance will be improved');
  }

  // Analyze user experience impact
  if (preferences.compressionLevel === 'MAXIMUM' && preferences.imageQuality === 'low') {
    impact.userExperience = 'reduced';
    impact.recommendations.push('Visual quality will be reduced for better performance');
  } else if (preferences.hapticFeedback && preferences.pushNotifications) {
    impact.userExperience = 'improved';
    impact.recommendations.push('Enhanced feedback will improve user experience');
  }

  return impact;
}

/**
 * Utility functions
 */
function getPlatform(userAgent: string): string {
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  return 'unknown';
}

function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'unknown';
}