# Email Verification and Password Reset Setup

## Overview
This document explains the email verification and password reset functionality that has been added to the Cargo360 API.

## Features Added

### 1. Email Verification
- Users must verify their email address after signup
- Verification emails are sent automatically during registration
- Users cannot login until their email is verified
- Verification tokens expire after 24 hours

### 2. Password Reset
- Users can request password reset via email
- Reset tokens expire after 1 hour
- Secure token-based reset process

## New API Endpoints

### Email Verification
- `GET /auth/verify-email?token={token}` - Verify email with token
- `POST /auth/resend-verification` - Resend verification email
  ```json
  {
    "email": "user@example.com"
  }
  ```

### Password Reset
- `POST /auth/forgot-password` - Request password reset
  ```json
  {
    "email": "user@example.com"
  }
  ```

- `POST /auth/reset-password` - Reset password with token
  ```json
  {
    "token": "reset_token_here",
    "password": "new_password"
  }
  ```

## Database Changes
New fields added to Users table:
- `isEmailVerified` (BOOLEAN) - Email verification status
- `emailVerificationToken` (STRING) - Token for email verification
- `emailVerificationExpires` (DATE) - Expiration time for verification token
- `passwordResetToken` (STRING) - Token for password reset
- `passwordResetExpires` (DATE) - Expiration time for reset token

## Email Configuration
Update your `.env` file with the following email settings:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
CLIENT_URL=http://localhost:3000
```

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `EMAIL_PASS`

### Other Email Providers
For other providers, update `EMAIL_HOST` and `EMAIL_PORT`:
- **Outlook**: `smtp-mail.outlook.com`, port `587`
- **Yahoo**: `smtp.mail.yahoo.com`, port `587`
- **Custom SMTP**: Use your provider's settings

## Modified Behavior

### Signup Process
1. User registers with email/password
2. Account is created with `isEmailVerified: false`
3. Verification email is sent automatically
4. User receives success message but no JWT tokens
5. User must verify email before logging in

### Login Process
1. User provides email/password
2. Credentials are validated
3. Email verification status is checked
4. If not verified, login is rejected with 403 status
5. If verified, JWT tokens are returned

## Error Handling
- Invalid/expired tokens return 400 status
- Unverified email login attempts return 403 status
- Email sending failures are logged but don't break signup
- Password reset requests don't reveal if email exists (security)

## Security Features
- Tokens are cryptographically secure (32 bytes)
- Tokens have expiration times
- Password reset doesn't reveal user existence
- Tokens are cleared after successful use
- Minimum password length validation (6 characters)

## Testing the Implementation
1. Start the server: `npm run dev`
2. Register a new user
3. Check your email for verification link
4. Click the verification link or use the API endpoint
5. Test login after verification
6. Test forgot password flow

## Frontend Integration
The email templates include links that point to `CLIENT_URL` from your environment variables. Make sure your frontend handles these routes:
- `/verify-email?token={token}` - Email verification page
- `/reset-password?token={token}` - Password reset page
