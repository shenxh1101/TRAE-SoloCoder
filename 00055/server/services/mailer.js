const nodemailer = require('nodemailer');

let transporter = null;
let smtpConfigured = false;

function initMailer(config = {}) {
  const host = config.host || process.env.SMTP_HOST || '';
  const user = config.user || process.env.SMTP_USER || '';
  const pass = config.pass || process.env.SMTP_PASS || '';

  if (!host || !user || !pass) {
    smtpConfigured = false;
    console.log('[MAIL] SMTP未配置，邮件功能已降级为日志记录模式');
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port: config.port || parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user, pass }
    });
    smtpConfigured = true;
    console.log(`[MAIL] SMTP已配置 (${host})，邮件功能就绪`);
  } catch (err) {
    smtpConfigured = false;
    console.log(`[MAIL] SMTP初始化失败: ${err.message}，降级为日志记录模式`);
  }
}

function ensureMailer() {
  if (transporter === null) initMailer();
}

async function sendWarningEmail(to, taskName, message, details = '') {
  ensureMailer();

  if (!smtpConfigured) {
    console.log(`[MAIL-LOG] ⚠️ 预警邮件(未发送) → ${to} | 任务: ${taskName} | ${message}${details ? ' | ' + details : ''}`);
    return { success: true, mode: 'log', message: 'SMTP未配置，仅记录日志' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'optical-platform@optics.dev',
    to,
    subject: `⚠️ 光学设计预警: ${taskName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #991b1b; margin: 0;">⚠️ 光学设计预警通知</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p><strong>任务名称:</strong> ${taskName}</p>
          <p><strong>预警内容:</strong> ${message}</p>
          ${details ? `<p><strong>详细信息:</strong></p><pre style="background: #f1f5f9; padding: 12px; border-radius: 4px; font-size: 13px;">${details}</pre>` : ''}
          <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
            此邮件由光学系统自动设计与像差分析平台自动发送，请及时处理。
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAIL] 预警邮件已发送: ${info.messageId}`);
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error) {
    console.error(`[MAIL] 邮件发送失败，降级为日志: ${error.message}`);
    console.log(`[MAIL-LOG] ⚠️ 预警邮件(发送失败) → ${to} | 任务: ${taskName} | ${message}`);
    return { success: true, mode: 'fallback-log', error: error.message };
  }
}

async function sendCompletionEmail(to, taskName, qualityScore, meetsRequirements) {
  ensureMailer();

  const statusText = meetsRequirements ? '✅ 达标' : '❌ 未达标';

  if (!smtpConfigured) {
    console.log(`[MAIL-LOG] ✅ 完成邮件(未发送) → ${to} | 任务: ${taskName} | 评分: ${qualityScore} | ${statusText}`);
    return { success: true, mode: 'log', message: 'SMTP未配置，仅记录日志' };
  }

  const statusColor = meetsRequirements ? '#065f46' : '#92400e';
  const statusBg = meetsRequirements ? '#d1fae5' : '#fef3c7';

  const mailOptions = {
    from: process.env.SMTP_FROM || 'optical-platform@optics.dev',
    to,
    subject: `✅ 设计完成: ${taskName} - 像质评分 ${qualityScore}分`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #1e40af; margin: 0;">✅ 光学设计任务完成</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p><strong>任务名称:</strong> ${taskName}</p>
          <p><strong>像质评分:</strong> ${qualityScore} 分</p>
          <p><strong>达标状态:</strong> <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 4px;">${statusText}</span></p>
          <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
            请登录平台查看详细分析报告。
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAIL] 完成邮件已发送: ${info.messageId}`);
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error) {
    console.error(`[MAIL] 邮件发送失败，降级为日志: ${error.message}`);
    console.log(`[MAIL-LOG] ✅ 完成邮件(发送失败) → ${to} | 任务: ${taskName} | 评分: ${qualityScore}`);
    return { success: true, mode: 'fallback-log', error: error.message };
  }
}

function isSmtpConfigured() {
  return smtpConfigured;
}

module.exports = { initMailer, sendWarningEmail, sendCompletionEmail, isSmtpConfigured };
