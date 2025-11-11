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

// Send shipment creation notification to team
const sendShipmentNotification = async (shipment, customer) => {
  const transporter = createTransporter();
  const { SHIPMENT_NOTIFICATION_EMAILS } = require('./constants');
  
  const mailOptions = {
    from: {
      name: 'Cargo360 System',
      address: process.env.EMAIL_FROM || process.env.EMAIL_USER
    },
    to: SHIPMENT_NOTIFICATION_EMAILS.join(', '),
    replyTo: customer.email,
    subject: `New Shipment C360-PK-${shipment.id} - ${customer.email}`,
    // Plain text version
    text: `New Shipment Created - ID C360-PK-${shipment.id}

Customer Details:
- Name: ${customer.name}
- Email: ${customer.email}
- Company: ${customer.company || 'N/A'}
- Phone: ${customer.phone || 'N/A'}

Shipment Details:
- Shipment ID: C360-PK-${shipment.id}
- Status: ${shipment.status}
- Vehicle Type: ${shipment.vehicleType}
- Number of Vehicles: ${shipment.numberOfVehicles || 'N/A'}

Route Information:
- Pickup Location: ${shipment.pickupLocation}
- Drop Location: ${shipment.dropLocation}
- Delivery Date: ${shipment.deliveryDate || 'Not specified'}

Cargo Details:
- Cargo Type: ${shipment.cargoType}
- Cargo Weight: ${shipment.cargoWeight ? shipment.cargoWeight + ' kg' : 'N/A'}
- Cargo Size: ${shipment.cargoSize || 'N/A'}
- Description: ${shipment.description || 'N/A'}

Financial Details:
- Budget: ${shipment.budget ? 'PKR ' + shipment.budget : 'N/A'}
- Insurance: ${shipment.insurance ? 'Yes' : 'No'}
- Sales Tax: ${shipment.salesTax ? 'Yes' : 'No'}

Created At: ${new Date(shipment.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}

---
Cargo360 Admin Panel: ${process.env.ADMIN_URL || 'https://admin.cargo360pk.com'}`,
    // HTML version
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Shipment Created</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 700px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; background-color: #007bff; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚚 New Shipment Created</h1>
                    <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Shipment ID: C360-PK-${shipment.id}</p>
                  </td>
                </tr>
                
                <!-- Customer Details -->
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">👤 Customer Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold; width: 40%;">Name:</td>
                        <td style="padding: 8px 0; color: #333;">${customer.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Email:</td>
                        <td style="padding: 8px 0; color: #007bff;"><a href="mailto:${customer.email}" style="color: #007bff; text-decoration: none;">${customer.email}</a></td>
                      </tr>
                      ${customer.company ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Company:</td>
                        <td style="padding: 8px 0; color: #333;">${customer.company}</td>
                      </tr>
                      ` : ''}
                      ${customer.phone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Phone:</td>
                        <td style="padding: 8px 0; color: #333;">${customer.phone}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
                
                <!-- Shipment Summary -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #28a745; padding-bottom: 10px;">📦 Shipment Summary</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold; width: 40%;">Status:</td>
                        <td style="padding: 8px 0;">
                          <span style="background-color: #ffc107; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">
                            ${shipment.status}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Vehicle Type:</td>
                        <td style="padding: 8px 0; color: #333; text-transform: capitalize;">${shipment.vehicleType}</td>
                      </tr>
                      ${shipment.numberOfVehicles ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Number of Vehicles:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.numberOfVehicles}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
                
                <!-- Route Information -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #17a2b8; padding-bottom: 10px;">🗺️ Route Information</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold; width: 40%;">Pickup Location:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.pickupLocation}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Drop Location:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.dropLocation}</td>
                      </tr>
                      ${shipment.deliveryDate ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Delivery Date:</td>
                        <td style="padding: 8px 0; color: #dc3545; font-weight: bold;">${shipment.deliveryDate}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
                
                <!-- Cargo Details -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">📦 Cargo Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold; width: 40%;">Cargo Type:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.cargoType}</td>
                      </tr>
                      ${shipment.cargoWeight ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Cargo Weight:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.cargoWeight} kg</td>
                      </tr>
                      ` : ''}
                      ${shipment.cargoSize ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Cargo Size:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.cargoSize}</td>
                      </tr>
                      ` : ''}
                      ${shipment.description ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold; vertical-align: top;">Description:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.description}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
                
                <!-- Financial Details -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #28a745; padding-bottom: 10px;">💰 Financial Details</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      ${shipment.budget ? `
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold; width: 40%;">Budget:</td>
                        <td style="padding: 8px 0; color: #28a745; font-weight: bold; font-size: 18px;">PKR ${Number(shipment.budget).toLocaleString('en-PK')}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Insurance:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.insurance ? '✅ Yes' : '❌ No'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555; font-weight: bold;">Sales Tax:</td>
                        <td style="padding: 8px 0; color: #333;">${shipment.salesTax ? '✅ Yes' : '❌ No'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Metadata -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <p style="color: #777; font-size: 14px; margin: 0;">
                      <strong>Created At:</strong> ${new Date(shipment.createdAt).toLocaleString('en-PK', { 
                        timeZone: 'Asia/Karachi',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </td>
                </tr>
                
                <!-- Action Button -->
                <tr>
                  <td align="center" style="padding: 0 30px 30px 30px;">
                    <a href="${process.env.ADMIN_URL || 'https://admin.cargo360pk.com'}/order/${shipment.id}" 
                       style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                      View Shipment in Admin Panel
                    </a>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                    <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                      This is an automated notification from Cargo360 System<br>
                      Reply to this email will go to: ${customer.email}
                    </p>
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
      'X-Mailer': 'Cargo360 Notification Service',
      'X-Priority': '1',
      'Importance': 'high'
    }
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Shipment notification sent for #${shipment.id} to team`);
  } catch (error) {
    console.error('Error sending shipment notification:', error);
    // Don't throw error - we don't want to fail shipment creation if email fails
  }
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendShipmentNotification
};
