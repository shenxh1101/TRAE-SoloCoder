const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message || undefined,
      html: options.html || undefined
    };

    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.log(`📧 模拟发送邮件到: ${options.email}`);
      console.log(`   主题: ${options.subject}`);
      return { success: true, simulated: true };
    }

    const info = await transporter.sendMail(message);
    console.log(`📧 邮件已发送: ${info.messageId}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ 发送邮件失败:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
