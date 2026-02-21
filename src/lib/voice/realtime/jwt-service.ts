// ===========================================
// JWT SERVICE FOR VOICE WEBSOCKET
// Short-lived tokens for WebSocket authentication
// ===========================================

import jwt from 'jsonwebtoken';

export interface VoiceTokenPayload {
  sessionId: string;
  userId: string;
  creatorId: string;
  personalityId: string;
  mode: 'call' | 'inline';
  iat: number;
  exp: number;
}

// Token expires in 5 minutes (only needed for initial WebSocket connection)
const TOKEN_EXPIRY_SECONDS = 300;

/**
 * Get the JWT secret, ensuring it exists
 */
function getSecret(): string {
  const secret = process.env.VOICE_JWT_SECRET;
  if (!secret) {
    throw new Error('VOICE_JWT_SECRET not configured');
  }
  return secret;
}

/**
 * Generate a voice session token
 */
export function generateVoiceToken(params: {
  sessionId: string;
  userId: string;
  creatorId: string;
  personalityId: string;
  mode: 'call' | 'inline';
}): string {
  const secret = getSecret();

  const payload: Omit<VoiceTokenPayload, 'iat' | 'exp'> = {
    sessionId: params.sessionId,
    userId: params.userId,
    creatorId: params.creatorId,
    personalityId: params.personalityId,
    mode: params.mode,
  };

  return jwt.sign(payload, secret, {
    expiresIn: TOKEN_EXPIRY_SECONDS,
    algorithm: 'HS256',
  });
}

/**
 * Verify a voice session token
 */
export function verifyVoiceToken(token: string): VoiceTokenPayload | null {
  try {
    const secret = getSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as VoiceTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[JWT] Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('[JWT] Invalid token:', error.message);
    } else {
      console.error('[JWT] Verification error:', error);
    }
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeVoiceToken(token: string): VoiceTokenPayload | null {
  try {
    const decoded = jwt.decode(token) as VoiceTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is close to expiry (within 5 minutes)
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as VoiceTokenPayload;
    if (!decoded || !decoded.exp) return true;

    const expiresAt = decoded.exp * 1000; // Convert to milliseconds
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() > (expiresAt - fiveMinutes);
  } catch {
    return true;
  }
}

/**
 * Refresh a token (generates new token with same session info)
 */
export function refreshVoiceToken(token: string): string | null {
  const decoded = verifyVoiceToken(token);
  if (!decoded) return null;

  return generateVoiceToken({
    sessionId: decoded.sessionId,
    userId: decoded.userId,
    creatorId: decoded.creatorId,
    personalityId: decoded.personalityId,
    mode: decoded.mode,
  });
}
