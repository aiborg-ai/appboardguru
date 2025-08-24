/**
 * Biometric Authentication Challenge API
 * Generates challenges for WebAuthn registration and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { action, userId } = await request.json();

    if (!action || !['register', 'authenticate'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (register or authenticate)' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Generate challenge
    const challenge = crypto.randomBytes(32).toString('base64url');
    
    if (action === 'register') {
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required for registration' },
          { status: 400 }
        );
      }

      // Get user information
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Store challenge in database with expiration
      const { error: challengeError } = await supabase
        .from('biometric_challenges')
        .upsert({
          user_id: userId,
          challenge,
          action: 'register',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          created_at: new Date().toISOString(),
        });

      if (challengeError) {
        throw challengeError;
      }

      return NextResponse.json({
        challenge,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim() || user.email,
        },
      });

    } else if (action === 'authenticate') {
      // For authentication, we don't need user ID as it will be determined from the credential

      // Store challenge in database
      const challengeId = crypto.randomUUID();
      const { error: challengeError } = await supabase
        .from('biometric_challenges')
        .insert({
          id: challengeId,
          challenge,
          action: 'authenticate',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          created_at: new Date().toISOString(),
        });

      if (challengeError) {
        throw challengeError;
      }

      return NextResponse.json({
        challenge,
        challengeId,
      });
    }

  } catch (error) {
    console.error('Biometric challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('challengeId');

    if (!challengeId) {
      return NextResponse.json(
        { error: 'Challenge ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get challenge status
    const { data: challenge, error } = await supabase
      .from('biometric_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Check if challenge has expired
    const isExpired = new Date(challenge.expires_at) < new Date();

    return NextResponse.json({
      challengeId,
      action: challenge.action,
      isExpired,
      expiresAt: challenge.expires_at,
    });

  } catch (error) {
    console.error('Challenge status error:', error);
    return NextResponse.json(
      { error: 'Failed to get challenge status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('challengeId');
    const userId = searchParams.get('userId');

    const supabase = createSupabaseServerClient();
    
    if (challengeId) {
      // Delete specific challenge
      const { error } = await supabase
        .from('biometric_challenges')
        .delete()
        .eq('id', challengeId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Challenge deleted',
      });

    } else if (userId) {
      // Delete all challenges for user
      const { error } = await supabase
        .from('biometric_challenges')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'User challenges deleted',
      });

    } else {
      // Clean up expired challenges
      const { error } = await supabase
        .from('biometric_challenges')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Expired challenges cleaned up',
      });
    }

  } catch (error) {
    console.error('Challenge cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup challenges' },
      { status: 500 }
    );
  }
}