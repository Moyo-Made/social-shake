// import nodemailer from 'nodemailer';

// type EmailParams = {
//   to: string;
//   subject: string;
//   html: string;
//   from?: string;
// };

// export async function sendEmail({ to, subject, html, from }: EmailParams): Promise<boolean> {
// 	try {
// 	  console.log('Creating email transporter');
// 	  // Create a transporter (configure this with your SMTP settings)
// 	  const transporter = nodemailer.createTransport({
// 		host: process.env.SMTP_HOST || "smtp.example.com",
// 		port: parseInt(process.env.SMTP_PORT || "587"),
// 		secure: process.env.SMTP_SECURE === "true",
// 		auth: {
// 		  user: process.env.SMTP_USER || "user",
// 		  pass: process.env.SMTP_PASSWORD || "password",
// 		},
// 	  });
  
// 	  console.log('Sending email to:', to);
// 	  // Send the email
// 	  const info = await transporter.sendMail({
// 		from: from || process.env.EMAIL_FROM || '"Your App" <noreply@yourapp.com>',
// 		to,
// 		subject,
// 		html,
// 	  });
  
// 	  console.log(`Email sent: ${info.messageId}`);
// 	  return true;
// 	} catch (error) {
// 	  console.error("Detailed error sending email:", error);
// 	  return false;
// 	}
//   }