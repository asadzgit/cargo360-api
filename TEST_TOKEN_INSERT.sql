-- Insert device token for user 172 (replace with actual Expo push token)
-- Format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

INSERT INTO device_tokens (user_id, expo_push_token, "createdAt", "updatedAt")
VALUES (
  172,  -- Your user ID
  'ExponentPushToken[YOUR_ACTUAL_TOKEN_HERE]',  -- Replace with real token from mobile app
  NOW(),
  NOW()
);

-- Verify it was inserted
SELECT id, user_id, expo_push_token, "createdAt" 
FROM device_tokens 
WHERE user_id = 172;


