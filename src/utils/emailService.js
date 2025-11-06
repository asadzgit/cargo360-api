const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email configuration - you'll need to set these in your .env file
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Additional options to improve deliverability
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Generate a secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send email verification
const sendVerificationEmail = async (user, token) => {
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.SERVER_URL || 'http://localhost:4000'}/auth/verify-email?token=${token}`;
  
  const mailOptions = {
    from: {
      name: 'Cargo360',
      address: process.env.EMAIL_FROM || process.env.EMAIL_USER
    },
    to: user.email,
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject: 'Verify Your Email - Cargo360',
    // Plain text version (important for spam filters)
    text: `Welcome to Cargo360!

Hi ${user.name},

Thank you for signing up! Please verify your email address by visiting the following link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with us, please ignore this email.

Best regards,
Cargo360 Team`,
    // HTML version
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Welcome to Cargo360!</h2>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${user.name},</p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Thank you for signing up! Please verify your email address by clicking the button below:</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verificationUrl}" style="background-color: #007bff; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; font-weight: bold;">Verify Email Address</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #777; font-size: 14px; line-height: 1.6; margin: 20px 0;">Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #007bff; font-size: 14px; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">${verificationUrl}</p>
                    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 20px 0 10px 0;"><strong>This link will expire in 24 hours.</strong></p>
                    <p style="color: #777; font-size: 14px; line-height: 1.6; margin: 0;">If you didn't create an account with us, please ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">Best regards,<br>Cargo360 Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    headers: {
      'X-Mailer': 'Cargo360 Email Service',
      'X-Priority': '1',
      'Importance': 'high'
    }
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', user.email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, code) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: {
      name: 'Cargo360 Security',
      address: process.env.EMAIL_FROM || process.env.EMAIL_USER
    },
    to: user.email,
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject: 'Password Reset Code - Cargo360',
    // Plain text version (important for spam filters)
    text: `Password Reset Request

Hi ${user.name},

We received a request to reset your password. Use the confirmation code below to reset your password:

${code}

Enter this code in the app to reset your password.

IMPORTANT: This code will expire in 15 minutes for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
Cargo360 Team`,
    // HTML version
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${user.name},</p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">We received a request to reset your password. Use the confirmation code below to reset your password:</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border: 2px solid #e9ecef;">
                            <div style="color: #dc3545; font-size: 42px; font-weight: bold; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace;">
                              ${code}
                            </div>
                            <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">Enter this code in the app</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 20px 0;"><strong>⚠️ Important:</strong> This code will expire in <strong>15 minutes</strong> for security reasons.</p>
                    <p style="color: #777; font-size: 14px; line-height: 1.6; margin: 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">Best regards,<br>Cargo360 Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    headers: {
      'X-Mailer': 'Cargo360 Email Service',
      'X-Priority': '1',
      'Importance': 'high'
    }
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', user.email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail
};
