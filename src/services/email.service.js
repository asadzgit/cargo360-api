const nodemailer = require('nodemailer');

/**
 * Email service for sending emails
 * This service is used by BullMQ workers to send emails
 */

// Create email transporter
const createTransporter = () => {
  // Validate email credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
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

/**
 * Send email verification email
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} token - Verification token
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (email, name, token) => {
  const transporter = createTransporter();
  
  // Build verification URL - use CLIENT_URL for frontend or SERVER_URL for backend endpoint
  const baseUrl = process.env.CLIENT_URL || process.env.SERVER_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: {
      name: 'Cargo360',
      address: process.env.EMAIL_FROM || process.env.EMAIL_USER
    },
    to: email,
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject: 'Verify Your Email - Cargo360',
    // Plain text version (important for spam filters)
    text: `Welcome to Cargo360!

Hi ${name},

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
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
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
    console.log(`[Email Service] Verification email sent to: ${email}`);
  } catch (error) {
    console.error('[Email Service] Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

module.exports = {
  sendVerificationEmail,
};

