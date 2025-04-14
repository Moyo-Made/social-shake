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
import { db } from "@/config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { cn } from "@/lib/utils";
import TicketConfirmation from "./TicketConfirmation";

export default function ContactSupportForm() {
  const [issueType, setIssueType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      console.error("User not authenticated");
    }
  }, [userId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create ticket in Firestore
      const ticketRef = await addDoc(collection(db, "tickets"), {
        userId: userId,
        issueType,
        subject,
        description,
        selectedFile: null,
        createdBy: userId,
        status: "open",
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        messages: [
          {
            sender: "user",
            content: description,
          },
        ],
        timestamp: serverTimestamp(),
      });

      // Set the submitted ticket ID to show confirmation
      setSubmittedTicketId(ticketRef.id);
    } catch (error) {
      console.error("Error submitting ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form and go back to form view
  const handleSubmitAnother = () => {
    setIssueType("");
    setSubject("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setSubmittedTicketId(null);
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

      {submittedTicketId ? (
        <TicketConfirmation 
          ticketId={submittedTicketId} 
          onSubmitAnother={handleSubmitAnother}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2">Issue Type</label>
            <Select value={issueType} onValueChange={setIssueType} required>
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

          <div>
            <label className="block mb-2">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief Description of your Issue"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide as much detail as possible"
              rows={6}
              maxLength={500}
              required
            />
            <p className="text-xs text-gray-500 mt-1">(Max: 500 characters)</p>
          </div>

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

          <div className="bg-[#FDEFE7] rounded-lg px-4 py-3 flex items-start w-fit">
            <span className="text-[#BE4501] mr-2">ⓘ</span>
            <p className="text-sm text-[#BE4501]">
              For urgent issues related to content removal or security concerns,
              please note this in your subject line.
            </p>
          </div>

          <div className="text-right">
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Support Request"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}