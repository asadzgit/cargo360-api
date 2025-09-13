# Gmail Email Setup Guide

The error `535-5.7.8 Username and Password not accepted` means your Gmail credentials are not configured correctly.

## Steps to Fix:

### 1. Enable 2-Factor Authentication on Gmail
- Go to your Google Account settings
- Navigate to Security → 2-Step Verification
- Enable 2-factor authentication if not already enabled

### 2. Generate App Password
- In Google Account settings, go to Security
- Under "2-Step Verification", click on "App passwords"
- Select "Mail" as the app
- Generate a 16-character app password (e.g., `abcd efgh ijkl mnop`)

### 3. Update Your .env File
Replace the email configuration in your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=your-actual-email@gmail.com
CLIENT_URL=http://localhost:3000
```

### 4. Important Notes:
- **EMAIL_USER**: Your full Gmail address (e.g., `john.doe@gmail.com`)
- **EMAIL_PASS**: The 16-character app password (NOT your regular Gmail password)
- **EMAIL_FROM**: Same as EMAIL_USER
- Remove any spaces from the app password

### 5. Custom Domain Email Setup
If you're using a custom domain email (e.g., `yourname@yourdomain.com`), configure your `.env` file based on your email provider:

#### Common Custom Domain Providers:

**For cPanel/Shared Hosting:**
```env
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=yourname@yourdomain.com
EMAIL_PASS=your-email-password
EMAIL_FROM=yourname@yourdomain.com
```

**For Google Workspace (G Suite):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourname@yourdomain.com
EMAIL_PASS=your-app-password
EMAIL_FROM=yourname@yourdomain.com
```

**For Microsoft 365/Outlook:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=yourname@yourdomain.com
EMAIL_PASS=your-email-password
EMAIL_FROM=yourname@yourdomain.com
```

**For Cloudflare Email Routing + Gmail:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=yourname@yourdomain.com
```

#### How to Find Your SMTP Settings:
1. **Check your hosting provider's documentation** (cPanel, Plesk, etc.)
2. **Contact your domain registrar** or hosting provider
3. **Common SMTP hosts**:
   - `mail.yourdomain.com`
   - `smtp.yourdomain.com`
   - `yourdomain.com`

#### Security Settings:
- **Port 587**: STARTTLS (recommended)
- **Port 465**: SSL/TLS
- **Port 25**: Usually blocked by hosting providers

### 6. Alternative: Use a Test Email Service
For development/testing, you can use Ethereal Email:

```javascript
// Add this to your emailService.js for testing
const createTestTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
};
```

### 6. Restart Your Server
After updating the `.env` file:
```bash
yarn run dev
```

## Troubleshooting:
- Make sure there are no extra spaces in your credentials
- Verify the app password is exactly 16 characters
- Ensure 2FA is enabled on your Google account
- Try generating a new app password if the current one doesn't work
