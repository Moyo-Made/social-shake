import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface SupportFormData {
	fullName: string;
	email: string;
	issueType: string;
	subject: string;
	description: string;
	userId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateSupportData(data: any): data is SupportFormData {
	return (
		typeof data.fullName === "string" &&
		typeof data.email === "string" &&
		typeof data.issueType === "string" &&
		typeof data.subject === "string" &&
		typeof data.description === "string" &&
		data.fullName.trim().length > 0 &&
		data.email.includes("@") &&
		data.issueType.trim().length > 0 &&
		data.subject.trim().length > 0 &&
		data.description.trim().length > 0 &&
		data.description.length <= 500
	);
}

export async function POST(request: NextRequest) {
	try {
		// Parse the request body (can be JSON or FormData)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let body: any;
		const contentType = request.headers.get("content-type");
		
		if (contentType?.includes("multipart/form-data")) {
			const formData = await request.formData();
			body = {
				fullName: formData.get("fullName") as string,
				email: formData.get("email") as string,
				issueType: formData.get("issueType") as string,
				subject: formData.get("subject") as string,
				description: formData.get("description") as string,
				userId: formData.get("userId") as string,
			};
		} else {
			body = await request.json();
		}

		// Validate the input data
		if (!validateSupportData(body)) {
			return NextResponse.json(
				{ error: "Invalid form data. Please check all fields." },
				{ status: 400 }
			);
		}

		const { fullName, email, issueType, subject, description, userId }: SupportFormData = body;

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

		// Get issue type display name
		const getIssueTypeDisplay = (type: string) => {
			const types: Record<string, string> = {
				payment: "Payment Issue",
				campaign: "Campaign/Contest Question",
				security: "Account Security",
				technical: "Technical Bug",
				other: "Other"
			};
			return types[type] || type;
		};

		// Email content
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: "akanjimoyomade@gmail.com",
			replyTo: email,
			subject: `Support Request: ${subject}`,
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
					red500: "#ef4444",
					yellow500: "#eab308",
					green500: "#22c55e",
					blue500: "#3b82f6",
				};

				// Get priority color based on issue type
				const getPriorityColor = (type: string) => {
					switch (type) {
						case "security": return colors.red500;
						case "payment": return colors.yellow500;
						case "technical": return colors.blue500;
						default: return colors.primary;
					}
				};

				const priorityColor = getPriorityColor(issueType);

				const styles = {
					container: `max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${colors.gray700};`,
					header: `background: ${colors.primary}; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;`,
					headerTitle: `margin: 0; color: ${colors.white}; font-size: 24px; font-weight: 600;`,
					headerSubtitle: `margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;`,
					content: `background: ${colors.white}; padding: 32px 24px; border: 1px solid ${colors.gray200}; border-top: none; border-radius: 0 0 8px 8px;`,
					priorityBadge: `display: inline-block; background: ${priorityColor}; color: ${colors.white}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px;`,
					table: `display: table; width: 100%; border-collapse: collapse;`,
					tableRow: `display: table-row;`,
					tableLabel: `display: table-cell; padding: 12px 0; border-bottom: 1px solid ${colors.gray100}; font-weight: 600; color: ${colors.gray700}; width: 120px;`,
					tableValue: `display: table-cell; padding: 12px 0; border-bottom: 1px solid ${colors.gray100}; color: ${colors.gray900};`,
					tableValueLast: `display: table-cell; padding: 12px 0; color: ${colors.gray900};`,
					emailLink: `color: ${colors.primary}; text-decoration: none; font-weight: 500;`,
					messageTitle: `margin: 0 0 16px 0; color: ${colors.gray900}; font-size: 18px; font-weight: 600;`,
					messageBox: `background: ${colors.gray50}; border: 1px solid ${colors.gray200}; border-radius: 6px; padding: 20px; font-size: 15px; line-height: 1.6; color: ${colors.gray700}; white-space: pre-wrap;`,
					urgentBox: `background: #fef2f2; border: 2px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px; color: #dc2626;`,
					button: `display: inline-block; background: ${colors.primary}; color: ${colors.white}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 12px;`,
					buttonSecondary: `display: inline-block; background: ${colors.gray100}; color: ${colors.gray700}; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;`,
					footer: `text-align: center; padding: 20px; color: ${colors.gray500}; font-size: 14px;`,
					footerText: `margin: 0;`,
				};

				// Check if it's urgent
				const isUrgent = subject.toLowerCase().includes('urgent') || 
								description.toLowerCase().includes('urgent') ||
								issueType === 'security';

				return `
				<div style="${styles.container}">
				  
				  <!-- Header -->
				  <div style="${styles.header}">
					<h1 style="${styles.headerTitle}">🎫 New Support Ticket</h1>
					<p style="${styles.headerSubtitle}">Social Shake Support Request</p>
				  </div>
		  
				  <!-- Content -->
				  <div style="${styles.content}">
					
					<!-- Priority Badge -->
					<div style="${styles.priorityBadge}">${getIssueTypeDisplay(issueType)}</div>
					
					${isUrgent ? `
					<!-- Urgent Alert -->
					<div style="${styles.urgentBox}">
					  <strong>⚠️ URGENT REQUEST</strong><br>
					  This support request has been marked as urgent and may require immediate attention.
					</div>
					` : ''}
					
					<!-- Contact Details -->
					<div style="margin-bottom: 32px;">
					  <div style="${styles.table}">
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Customer:</div>
						  <div style="${styles.tableValue}">${fullName}</div>
						</div>
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Email:</div>
						  <div style="${styles.tableValue}">
							<a href="mailto:${email}" style="${styles.emailLink}">${email}</a>
						  </div>
						</div>
						
						${userId ? `
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">User ID:</div>
						  <div style="${styles.tableValue}"><code>${userId}</code></div>
						</div>
						` : ''}
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Issue Type:</div>
						  <div style="${styles.tableValue}">${getIssueTypeDisplay(issueType)}</div>
						</div>
						
						<div style="${styles.tableRow}">
						  <div style="${styles.tableLabel}">Subject:</div>
						  <div style="${styles.tableValueLast}"><strong>${subject}</strong></div>
						</div>
						
					  </div>
					</div>
		  
					<!-- Description -->
					<div style="margin-bottom: 32px;">
					  <h3 style="${styles.messageTitle}">Issue Description</h3>
					  <div style="${styles.messageBox}">${description}</div>
					</div>
		  
					<!-- Action Buttons -->
					<div style="text-align: center;">
					  <a href="mailto:${email}?subject=Re: ${subject}" style="${styles.button}">
						📧 Reply to Customer
					  </a>
					  <a href="mailto:support@social-shake.com?subject=Internal: ${subject}" style="${styles.buttonSecondary}">
						💬 Internal Discussion
					  </a>
					</div>
		  
				  </div>
		  
				  <!-- Footer -->
				  <div style="${styles.footer}">
					<p style="${styles.footerText}">
					  Sent via Social Shake Support System • ${new Date().toLocaleDateString("en-US", { 
						  weekday: "short", 
						  month: "short", 
						  day: "numeric", 
						  year: "numeric",
						  hour: "2-digit",
						  minute: "2-digit"
					  })}
					</p>
				  </div>
		  
				</div>
			  `;
			})(),
			text: `
		  🎫 NEW SUPPORT TICKET
		  
		  Customer: ${fullName}
		  Email: ${email}
		  Issue Type: ${getIssueTypeDisplay(issueType)}
		  Subject: ${subject}
		  ${userId ? `User ID: ${userId}` : ''}
		  
		  ${subject.toLowerCase().includes('urgent') || description.toLowerCase().includes('urgent') || issueType === 'security' ? '⚠️ URGENT REQUEST - May require immediate attention\n' : ''}
		  
		  Issue Description:
		  ${description}
		  
		  ---
		  Reply to customer: ${email}
		  Date: ${new Date().toLocaleDateString("en-US", { 
			  weekday: "long", 
			  month: "long", 
			  day: "numeric", 
			  year: "numeric",
			  hour: "2-digit",
			  minute: "2-digit"
		  })}
		  Sent via Social Shake Support System
			`,
		};

		// Send the email
		const info = await transporter.sendMail(mailOptions);

		return NextResponse.json(
			{
				message: "Support request sent successfully",
				messageId: info.messageId,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("💥 Unexpected error in support API route:", error);

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