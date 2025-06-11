"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, MessageCircle, Shield, Bug, CreditCard, HelpCircle } from "lucide-react";

export default function ContactSupportForm() {
  const [selectedIssue, setSelectedIssue] = useState<string>("");

  const issueTypes = [
    {
      id: "payment",
      title: "Payment Issue",
      icon: CreditCard,
      description: "Billing, refunds, or payment problems",
      subject: "Payment Issue - Need Assistance"
    },
    {
      id: "campaign",
      title: "Campaign/Contest Question",
      icon: MessageCircle,
      description: "Questions about campaigns or contests",
      subject: "Campaign/Contest Question"
    },
    {
      id: "security",
      title: "Account Security",
      icon: Shield,
      description: "Security concerns or account access issues",
      subject: "URGENT: Account Security Issue"
    },
    {
      id: "technical",
      title: "Technical Bug",
      icon: Bug,
      description: "App bugs or technical difficulties",
      subject: "Technical Bug Report"
    },
    {
      id: "other",
      title: "Other",
      icon: HelpCircle,
      description: "General questions or other inquiries",
      subject: "General Inquiry"
    }
  ];

  const handleEmailClick = (issueType?: typeof issueTypes[0]) => {
    const email = "info@social-shake.com";
    const subject = issueType ? issueType.subject : "Support Request";
    const body = issueType 
      ? `Hi Social Shake Support Team,

I need assistance with: ${issueType.title}

Issue Description:
[Please describe your issue in detail here]

Additional Information:
- Account Email: [Your email address]
- Date/Time of Issue: [When did this occur]
- Device/Browser: [What device/browser are you using]

Thank you for your help!

Best regards,
[Your Name]`
      : `Hi Social Shake Support Team,

I need assistance with:
[Please describe your issue in detail here]

Additional Information:
- Account Email: [Your email address]
- Date/Time of Issue: [When did this occur]
- Device/Browser: [What device/browser are you using]

Thank you for your help!

Best regards,
[Your Name]`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Contact Support</h2>
        <p className="text-gray-500">
          Choose your issue type below and we&apos;ll help you get in touch with our support team.
        </p>
      </div>

      {/* Quick Contact Options */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-orange-900">Need immediate help?</h3>
            <p className="text-orange-700 text-sm">Contact us directly at info@social-shake.com</p>
          </div>
          <Button
            onClick={() => handleEmailClick()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Mail className="mr-1 h-4 w-4" />
            Email Us
          </Button>
        </div>
      </div>

      {/* Issue Type Selection */}
      <div>
        <h3 className="text-lg font-medium mb-4">What can we help you with?</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {issueTypes.map((issue) => {
            const Icon = issue.icon;
            return (
              <div
                key={issue.id}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                  ${selectedIssue === issue.id 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => setSelectedIssue(issue.id)}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-6 w-6 mt-1 ${selectedIssue === issue.id ? 'text-orange-500' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{issue.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{issue.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Issue Action */}
      {selectedIssue && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-900 font-medium">
                Ready to contact us about: {issueTypes.find(i => i.id === selectedIssue)?.title}
              </p>
              <p className="text-blue-700 text-sm">
                Click below to open Gmail with a pre-filled email template
              </p>
            </div>
            <Button
              onClick={() => handleEmailClick(issueTypes.find(i => i.id === selectedIssue))}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="mr-1 h-4 w-4" />
              Send Email
            </Button>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <Alert className="bg-amber-50 border-amber-200">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>For urgent security issues:</strong> Please mark your email as &quot;URGENT&quot; in the subject line and we&apos;ll prioritize your request.
        </AlertDescription>
      </Alert>

      {/* Support Info */}
      <div className="text-center text-sm text-gray-500 space-y-2">
        <p>Our support team typically responds within 24 hours</p>
        <p>
          You can also reach us directly at:{" "}
          <button
            onClick={() => handleEmailClick()}
            className="text-orange-600 hover:text-orange-700 underline"
          >
            info@social-shake.com
          </button>
        </p>
      </div>
    </div>
  );
}