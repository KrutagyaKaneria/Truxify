import { supabase } from '../config/db.js';
import logger from '../middleware/logger.js';

const VALID_PLATFORMS = ['android', 'ios', 'web'];

function validateFcmToken(token) {
  if (!token || typeof token !== 'string') return 'fcmToken must be a non-empty string';
  if (token.length < 10 || token.length > 4096) return 'fcmToken length must be between 10 and 4096';
  if (!/^[a-zA-Z0-9\-_:]+$/.test(token)) return 'fcmToken contains invalid characters';
  return null;
}

function validatePlatform(platform) {
  if (!platform) return null;
  return VALID_PLATFORMS.includes(platform) ? null : `Platform must be one of: ${VALID_PLATFORMS.join(', ')}`;
}

/**
 * Register / update FCM token for a user device
 */
export async function registerDeviceToken(req, res) {
  try {
    const userId = req.user?.id;
    const { fcmToken, platform } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const tokenErr = validateFcmToken(fcmToken);
    if (tokenErr) {
      return res.status(400).json({ error: tokenErr });
    }

    const platErr = validatePlatform(platform);
    if (platErr) {
      return res.status(400).json({ error: platErr });
    }

    const { error } = await supabase.from('user_devices').upsert(
      {
        user_id: userId,
        fcm_token: fcmToken,
        platform: platform || 'android'
      },
      { onConflict: 'fcm_token' }
    );

    if (error) {
      logger.error('[DeviceController] Failed to register device token in database:', error.message);
      return res.status(500).json({
        error: 'Failed to register device'
      });
    }
    
    const { error: profileSyncError } = await supabase
      .from('profiles')
      .update({
        fcm_token: fcmToken,
        fcm_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileSyncError) {
      logger.error(
        '[DeviceController] Device token saved but failed to sync profiles.fcm_token:',
        profileSyncError.message
      );
    }

    return res.json({
      success: true,
      message: 'Device token registered'
    });
  } catch (err) {
    logger.error('[DeviceController] Unexpected error in registerDeviceToken:', err.message);
    return res.status(500).json({
      error: 'An unexpected error occurred'
    });
  }
}
