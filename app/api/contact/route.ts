import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface ContactFormData {
	fullName: string;
	email: string;
	subject: string;
	message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateContactData(data: any): data is ContactFormData {
	return (
		typeof data.fullName === "string" &&
		typeof data.email === "string" &&
		typeof data.subject === "string" &&
		typeof data.message === "string" &&
		data.fullName.trim().length > 0 &&
		data.email.includes("@") &&
		data.subject.trim().length > 0 &&
		data.message.trim().length > 0 &&
		data.message.length <= 2000
	);
}

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const body = await request.json();

		// Validate the input data
		if (!validateContactData(body)) {
			return NextResponse.json(
				{ error: "Invalid form data. Please check all fields." },
				{ status: 400 }
			);
		}

		const { fullName, email, subject, message }: ContactFormData = body;

		if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
			console.error("❌ Missing email configuration");
			return NextResponse.json(
				{ error: "Email service not configured" },
				{ status: 500 }
			);
		}

		// Create transporter with App Password
		const transporter = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 587,
			secure: false, // true for 465, false for other ports
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});

		try {
			await transporter.verify();
		} catch (verifyError) {
			console.error("❌ SMTP verification failed:", verifyError);

			// Log the specific error details
			if (verifyError instanceof Error) {
				console.error("Error name:", verifyError.name);
				console.error("Error message:", verifyError.message);
				console.error("Error stack:", verifyError.stack);

				// Return specific error based on the verification failure
				if (verifyError.message.includes("535")) {
					return NextResponse.json(
						{
							error:
								"Gmail authentication failed. Please check your email and app password.",
						},
						{ status: 500 }
					);
				}
				if (
					verifyError.message.includes("Username and Password not accepted")
				) {
					return NextResponse.json(
						{
							error:
								"Invalid Gmail credentials. Make sure you are using an App Password, not your regular password.",
						},
						{ status: 500 }
					);
				}
			}

			return NextResponse.json(
				{
					error: `SMTP verification failed: ${verifyError instanceof Error ? verifyError.message : "Unknown error"}`,
				},
				{ status: 500 }
			);
		}

		// Email content
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: "info@social-shake.com",
			replyTo: email,
			subject: `Contact Form: ${subject}`,
			html: (() => {
				// Style variables for easy maintenance
				const colors = {
					primary: "#FD5C02",
					primaryLight: "rgba(253, 92, 2, 0.1)",
					white: "#ffffff",
					gray900: "#111827",
					gray700: "#374151",
					gray500: "#6b7280",
					gray200: "#e5e7eb",
					gray100: "#f3f4f6",
					gray50: "#f9fafb",
				};

				const styles = {
					container: `max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${colors.gray700};`,
					header: `background: ${colors.primary}; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;`,
					headerTitle: `margin: 0; color: ${colors.white}; font-size: 24px; font-weight: 600;`,
					headerSubtitle: `margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;`,
					content: `background: ${colors.white}; padding: 32px 24px; border: 1px solid ${colors.gray200}; border-top: none; border-radius: 0 0 8px 8px;`,
					table: `display: table; width: 100%; border-collapse: collapse;`,
					tableRow: `display: table-row;`,
					tableLabel: `display: table-cell; padding: 12px 0; border-bottom: 1px solid ${colors.gray100}; font-weight: 600; color: ${colors.gray700}; width: 100px;`,
					tableValue: `display: table-cell; padding: 12px 0; border-bottom: 1px solid ${colors.gray100}; color: ${colors.gray900};`,
					tableValueLast: `display: table-cell; padding: 12px 0; color: ${colors.gray900};`,
					emailLink: `color: ${colors.primary}; text-decoration: none; font-weight: 500;`,
					messageTitle: `margin: 0 0 16px 0; color: ${colors.gray900}; font-size: 18px; font-weight: 600;`,
					messageBox: `background: ${colors.gray50}; border: 1px solid ${colors.gray200}; border-radius: 6px; padding: 20px; font-size: 15px; line-height: 1.6; color: ${colors.gray700}; white-space: pre-wrap;`,
					button: `display: inline-block; background: ${colors.primary}; color: ${colors.white}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;`,
					footer: `text-align: center; padding: 20px; color: ${colors.gray500}; font-size: 14px;`,
					footerText: `margin: 0;`,
				};

				return `
				<div style="${styles.container}">
				  
				  <!-- Header -->
				  <div style="${styles.header}">
					<h1 style="${styles.headerTitle}">New Contact Message</h1>
					<p style="${styles.headerSubtitle}">Social Shake Contact Form</p>
				  </div>
		  
				  <!-- Content -->
				  <div style="${styles.content}">
					
					<!-- Contact Details -->
					<div style="margin-bottom: 32px;">
					  <div style="${styles.table}">
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Name:</div>
						  <div style="${styles.tableValue}">${fullName}</div>
						</div>
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Email:</div>
						  <div style="${styles.tableValue}">
							<a href="mailto:${email}" style="${styles.emailLink}">${email}</a>
						  </div>
						</div>
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Subject:</div>
						  <div style="${styles.tableValueLast}">${subject}</div>
						</div>
						
					  </div>
					</div>
		  
					<!-- Message -->
					<div style="margin-bottom: 32px;">
					  <h3 style="${styles.messageTitle}">Message</h3>
					  <div style="${styles.messageBox}">${message}</div>
					</div>
		  
					<!-- Reply Button -->
					<div style="text-align: center;">
					  <a href="mailto:${email}?subject=Re: ${subject}" style="${styles.button}">
						Reply to ${fullName.split(" ")[0]}
					  </a>
					</div>
		  
				  </div>
		  
				  <!-- Footer -->
				  <div style="${styles.footer}">
					<p style="${styles.footerText}">
					  Sent via Social Shake • ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
					</p>
				  </div>
		  
				</div>
			  `;
			})(),
			text: `
		  NEW CONTACT FORM SUBMISSION
		  
		  Name: ${fullName}
		  Email: ${email}
		  Subject: ${subject}
		  
		  Message:
		  ${message}
		  
		  ---
		  Reply to: ${email}
		  Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
		  Sent via Social Shake Contact Form
			`,
		};

		// Send the email
		const info = await transporter.sendMail(mailOptions);

		return NextResponse.json(
			{
				message: "Email sent successfully",
				messageId: info.messageId,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("💥 Unexpected error in API route:", error);

		// Log detailed error information
		if (error instanceof Error) {
			console.error("Error details:", {
				name: error.name,
				message: error.message,
				stack: error.stack,
			});
		} else {
			console.error("Non-Error object thrown:", error);
		}

		return NextResponse.json(
			{
				error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
	return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
