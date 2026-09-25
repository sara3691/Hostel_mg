import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Universal Brevo Email Service
 * Supports:
 * 1. Brevo REST API v3 (via BREVO_API_KEY)
 * 2. Brevo SMTP / Custom SMTP (via BREVO_SMTP_USER & BREVO_SMTP_KEY or SMTP_USER & SMTP_PASS)
 * 3. Local Console Simulation (if no credentials provided in .env)
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, toName, subject, htmlContent, textContent } = options;
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || process.env.SMTP_FROM || 'notifications@smarthostel.ai';
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'SmartHostel AI';

  // 1. Try Brevo REST API v3
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to, name: toName || to.split('@')[0] }],
          subject,
          htmlContent,
          textContent: textContent || subject
        })
      });

      const data: any = await response.json();
      if (!response.ok) {
        console.error('[Brevo API Error]', data);
        return { success: false, error: data?.message || 'Brevo API call failed' };
      }

      console.log(`[Brevo API] Email sent to ${to} (MessageId: ${data?.messageId})`);
      return { success: true, messageId: data?.messageId };
    } catch (err: any) {
      console.error('[Brevo API Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 2. Try SMTP Relay (Brevo SMTP or custom SMTP)
  const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html: htmlContent,
        text: textContent || subject
      });

      console.log(`[Brevo SMTP] Email sent to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[Brevo SMTP Error]', err);
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback: Dev Simulation Mode
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`📧 [EMAIL SIMULATION] (Set BREVO_API_KEY in .env for live delivery)`);
  console.log(`To:      ${toName ? `${toName} <${to}>` : to}`);
  console.log(`From:    ${senderName} <${senderEmail}>`);
  console.log(`Subject: ${subject}`);
  console.log(`Message Preview:\n${textContent || 'See HTML body'}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  return { success: true, simulated: true };
}

/**
 * Send 6-Digit Password Reset OTP Email
 */
export async function sendOtpEmail(toEmail: string, fullName: string, otp: string): Promise<EmailResult> {
  const subject = `Your SmartHostel Password Reset OTP: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F5DC; margin: 0; padding: 24px; color: #3E2723; }
        .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E0D6C2; box-shadow: 0 4px 14px rgba(62, 39, 35, 0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #E35336 0%, #C9442B 100%); padding: 24px; text-align: center; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.1em; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 15px; margin-bottom: 12px; font-weight: 600; color: #3E2723; }
        .desc { font-size: 13px; line-height: 1.6; color: #5D4037; margin-bottom: 20px; }
        .otp-box { background: #FFF0E8; border: 2px dashed #E35336; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #E35336; margin: 4px 0; }
        .otp-sub { font-size: 11px; color: #8D6E63; margin-top: 6px; }
        .alert { background: #FFF8E1; border-left: 4px solid #F4A460; padding: 10px 14px; font-size: 12px; color: #7B5B2E; border-radius: 4px; margin-top: 18px; }
        .footer { padding: 16px 24px; background: #FDFBF7; border-top: 1px solid #EDE8D0; text-align: center; font-size: 11px; color: #A1887F; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>SmartHostel AI</h1>
          <p>Enterprise Management System</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${fullName || 'User'},</div>
          <div class="desc">
            We received a request to reset your SmartHostel account password. Use the verification code below to complete the reset:
          </div>
          <div class="otp-box">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #8D6E63; font-weight: 600;">One-Time Password (OTP)</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-sub">⏳ Valid for the next 10 minutes only</div>
          </div>
          <div class="alert">
            ⚠️ <strong>Security Advisory:</strong> If you did not initiate this password reset request, you can safely ignore this email. Your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} SmartHostel Enterprise AI System. Automated notification, please do not reply directly.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    toName: fullName,
    subject,
    htmlContent,
    textContent: `Hello ${fullName},\n\nYour SmartHostel password reset OTP is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore.`
  });
}

/**
 * Send Custom Notice / Broadcast Email to Student
 */
export async function sendStudentNoticeEmail(options: {
  toEmail: string;
  studentName: string;
  subject: string;
  message: string;
  senderName?: string;
  hostelName?: string;
}): Promise<EmailResult> {
  const { toEmail, studentName, subject, message, senderName, hostelName } = options;
  const formattedMsg = message.replace(/\n/g, '<br/>');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F5DC; margin: 0; padding: 24px; color: #3E2723; }
        .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E0D6C2; box-shadow: 0 4px 14px rgba(62, 39, 35, 0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #A0522D 0%, #8B4726 100%); padding: 22px 24px; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 18px; font-weight: 800; }
        .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 15px; margin-bottom: 14px; font-weight: 700; color: #3E2723; }
        .subject-badge { display: inline-block; background: #FFF0E8; color: #E35336; border: 1px solid #F4C4A0; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
        .body-box { background: #FFFDF5; border: 1px solid #EDE8D0; border-radius: 8px; padding: 18px; font-size: 14px; line-height: 1.7; color: #4E342E; margin-bottom: 20px; }
        .meta { font-size: 12px; color: #8D6E63; line-height: 1.5; }
        .footer { padding: 16px 24px; background: #FDFBF7; border-top: 1px solid #EDE8D0; text-align: center; font-size: 11px; color: #A1887F; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>SmartHostel ${hostelName ? `· ${hostelName}` : 'Administration'}</h1>
          <p>Official Student Communication</p>
        </div>
        <div class="content">
          <div class="greeting">Dear ${studentName || 'Student'},</div>
          <div class="subject-badge">Notice: ${subject}</div>
          <div class="body-box">
            ${formattedMsg}
          </div>
          <div class="meta">
            <strong>Sent by:</strong> ${senderName || 'Hostel Administration'}<br/>
            <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div class="footer">
          SmartHostel Enterprise Communication System &bull; Please do not reply directly to this automated email.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: toEmail,
    toName: studentName,
    subject: `[Hostel Notice] ${subject}`,
    htmlContent,
    textContent: `Dear ${studentName},\n\nNotice: ${subject}\n\n${message}\n\nSent by: ${senderName || 'Hostel Administration'}`
  });
}
