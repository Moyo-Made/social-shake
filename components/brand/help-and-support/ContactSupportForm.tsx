"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ContactSupportForm() {
  const [formData, setFormData] = useState({
    issueType: "",
    subject: "",
    description: "",
    fullName: "",
    email: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [charCount, setCharCount] = useState(0);

  const { currentUser } = useAuth();

  // Create a preview URL when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Free memory when this component is unmounted
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Pre-fill user email if available
  useEffect(() => {
    if (currentUser?.email) {
      setFormData(prev => ({
        ...prev,
        email: currentUser.email,
        fullName: currentUser.displayName || ""
      }));
    }
  }, [currentUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'description') {
      setCharCount(value.length);
    }
  };

  const handleDrag = (e: {
    preventDefault: () => void;
    stopPropagation: () => void;
    type: string;
  }) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const validateForm = () => {
    const { fullName, email, issueType, subject, description } = formData;
    
    if (!fullName.trim()) return "Full name is required";
    if (!email.trim()) return "Email address is required";
    if (!email.includes('@')) return "Please enter a valid email address";
    if (!issueType) return "Please select an issue type";
    if (!subject.trim()) return "Subject is required";
    if (!description.trim()) return "Description is required";
    if (description.length > 500) return "Description must be less than 500 characters";
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: currentUser?.uid || ''
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          issueType: "",
          subject: "",
          description: "",
          fullName: currentUser?.displayName || "",
          email: currentUser?.email || ""
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        setCharCount(0);
      } else {
        const errorData = await response.json();
        console.error('Support request failed:', errorData);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error("Error submitting support request:", error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Contact Support</h2>
        <p className="text-gray-500">
          Submit a support request and our team will get back to you within 24
          hours.
        </p>
      </div>

      {/* Status Alerts */}
      {submitStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Thank you for your support request! We&apos;ll get back to you within 24 hours. Check your email for a confirmation.
          </AlertDescription>
        </Alert>
      )}

      {submitStatus === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            There was an error submitting your request. Please try again or contact us directly at support@yourcompany.com
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block mb-2">Full Name</label>
          <Input
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-2">Email Address</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email address"
            required
          />
        </div>

        {/* Issue Type */}
        <div>
          <label className="block mb-2">Issue Type</label>
          <Select 
            value={formData.issueType} 
            onValueChange={(value) => handleInputChange('issueType', value)} 
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Issue Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#f7f7f7]">
              <SelectItem value="payment">Payment Issue</SelectItem>
              <SelectItem value="campaign">
                Campaign/Contest Question
              </SelectItem>
              <SelectItem value="security">Account Security</SelectItem>
              <SelectItem value="technical">Technical Bug</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subject */}
        <div>
          <label className="block mb-2">Subject</label>
          <Input
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Brief Description of your Issue"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Please provide as much detail as possible"
            rows={6}
            maxLength={500}
            required
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">(Max: 500 characters)</p>
            <span className={`text-sm ${charCount > 450 ? 'text-red-600' : 'text-gray-500'}`}>
              {charCount}/500
            </span>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block mb-2">Attachments (Optional)</label>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
              dragActive ? "border-[#FD5C02] bg-orange-50" : "border-gray-300",
              selectedFile && "border-green-500 bg-green-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            {previewUrl ? (
              <div className="space-y-3">
                <div className="relative w-full max-w-md mx-auto h-48 rounded-lg overflow-hidden">
                  <Image
                    src={previewUrl}
                    alt="Thumbnail preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-green-600">
                  {selectedFile?.name || "Uploaded image"} - Click or drop to
                  change
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-lg py-1 px-2 w-12 mx-auto mb-2">
                  <Image
                    src="/icons/upload.svg"
                    alt="Upload"
                    width={40}
                    height={40}
                  />
                </div>
                <p className="text-gray-600 text-sm md:text-base">
                  <span className="text-[#FD5C02]">Click to upload</span> or
                  drag and drop
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PNG or JPG (800x400px)
                </p>
              </>
            )}
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-[#FDEFE7] rounded-lg px-4 py-3 flex items-start w-fit">
          <span className="text-[#BE4501] mr-2">ⓘ</span>
          <p className="text-sm text-[#BE4501]">
            For urgent issues related to content removal or security concerns,
            please note this in your subject line.
          </p>
        </div>

        {/* Submit Button */}
        <div className="text-right">
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Support Request"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}