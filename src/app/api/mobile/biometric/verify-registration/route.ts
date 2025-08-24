/**
 * Biometric Registration Verification API
 * Verifies WebAuthn registration responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';

interface AttestationResponse {
  attestationObject: string;
  clientDataJSON: string;
}

export async function POST(request: NextRequest) {
  try {
    const { credentialId, response, userId } = await request.json();

    if (!credentialId || !response || !userId) {
      return NextResponse.json(
        { error: 'Credential ID, response, and user ID are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Verify user exists and get challenge
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the challenge for this user
    const { data: challenge, error: challengeError } = await supabase
      .from('biometric_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('action', 'register')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Valid challenge not found' },
        { status: 400 }
      );
    }

    // Verify the attestation response
    const verificationResult = await verifyAttestationResponse(
      response,
      challenge.challenge,
      window.location.origin
    );

    if (!verificationResult.verified) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    // Store the credential
    const { data: credential, error: credentialError } = await supabase
      .from('biometric_credentials')
      .upsert({
        id: credentialId,
        user_id: userId,
        public_key: verificationResult.credentialPublicKey,
        counter: verificationResult.counter,
        device_type: detectDeviceType(request.headers.get('user-agent') || ''),
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (credentialError) {
      throw credentialError;
    }

    // Clean up the challenge
    await supabase
      .from('biometric_challenges')
      .delete()
      .eq('id', challenge.id);

    // Log the registration event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'biometric_credential_registered',
        details: {
          credential_id: credentialId,
          device_type: credential.device_type,
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      credential: {
        id: credential.id,
        deviceType: credential.device_type,
        createdAt: credential.created_at,
      },
      message: 'Biometric credential registered successfully',
    });

  } catch (error) {
    console.error('Biometric registration verification error:', error);
    return NextResponse.json(
      { error: 'Registration verification failed' },
      { status: 500 }
    );
  }
}

/**
 * Verify WebAuthn attestation response
 */
async function verifyAttestationResponse(
  response: AttestationResponse,
  expectedChallenge: string,
  expectedOrigin: string
): Promise<{
  verified: boolean;
  credentialPublicKey?: string;
  counter?: number;
  error?: string;
}> {
  try {
    // Decode client data JSON
    const clientDataJSON = JSON.parse(
      Buffer.from(response.clientDataJSON, 'base64').toString()
    );

    // Verify challenge
    const receivedChallenge = clientDataJSON.challenge;
    if (receivedChallenge !== expectedChallenge) {
      return { verified: false, error: 'Challenge mismatch' };
    }

    // Verify origin
    if (clientDataJSON.origin !== expectedOrigin) {
      return { verified: false, error: 'Origin mismatch' };
    }

    // Verify type
    if (clientDataJSON.type !== 'webauthn.create') {
      return { verified: false, error: 'Invalid ceremony type' };
    }

    // Decode attestation object
    const attestationObject = Buffer.from(response.attestationObject, 'base64');
    
    // For this example, we'll do basic validation
    // In production, you'd use a proper WebAuthn library like @simplewebauthn/server
    
    // Extract authenticator data (simplified)
    const authData = extractAuthenticatorData(attestationObject);
    if (!authData) {
      return { verified: false, error: 'Invalid authenticator data' };
    }

    // Verify RP ID hash (simplified)
    const rpIdHash = authData.slice(0, 32);
    const expectedRpIdHash = crypto.createHash('sha256')
      .update(new URL(expectedOrigin).hostname)
      .digest();

    if (!rpIdHash.equals(expectedRpIdHash)) {
      return { verified: false, error: 'RP ID hash mismatch' };
    }

    // Extract credential data
    const credentialData = extractCredentialData(authData);
    if (!credentialData) {
      return { verified: false, error: 'Invalid credential data' };
    }

    return {
      verified: true,
      credentialPublicKey: credentialData.publicKey.toString('base64'),
      counter: credentialData.counter,
    };

  } catch (error) {
    return {
      verified: false,
      error: `Verification error: ${error.message}`,
    };
  }
}

/**
 * Extract authenticator data from attestation object (simplified)
 */
function extractAuthenticatorData(attestationObject: Buffer): Buffer | null {
  try {
    // This is a very simplified extraction
    // In production, use a proper CBOR decoder
    // The attestation object is CBOR-encoded
    
    // For now, we'll assume the authenticator data starts at a known offset
    // This is NOT production-ready code
    return attestationObject.slice(37, 37 + 37); // Simplified extraction
  } catch (error) {
    return null;
  }
}

/**
 * Extract credential data from authenticator data (simplified)
 */
function extractCredentialData(authData: Buffer): { 
  publicKey: Buffer; 
  counter: number 
} | null {
  try {
    // This is extremely simplified
    // In production, properly parse the authenticator data structure
    
    const counter = authData.readUInt32BE(33); // Counter at bytes 33-36
    
    // For this example, we'll use a placeholder public key
    const publicKey = Buffer.from('placeholder-public-key');
    
    return { publicKey, counter };
  } catch (error) {
    return null;
  }
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android') && ua.includes('mobile')) return 'Android Phone';
  if (ua.includes('android')) return 'Android Tablet';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('macintosh')) return 'Mac';
  if (ua.includes('linux')) return 'Linux';
  
  return 'Unknown';
}

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
    
    // Get user's biometric credentials
    const { data: credentials, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      credentials: credentials?.map(cred => ({
        id: cred.id,
        deviceType: cred.device_type,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at,
      })) || [],
      count: credentials?.length || 0,
    });

  } catch (error) {
    console.error('Get biometric credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}