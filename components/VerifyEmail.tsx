// "use client";

// import { useState, useEffect } from "react";
// import { useSearchParams } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";

// export default function VerifyEmail() {
//   const [otp, setOtp] = useState("");
//   const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
//   const [isResending, setIsResending] = useState(false);
//   const searchParams = useSearchParams();
//   const email = searchParams.get("email");
//   const { verifyOTP, sendOTPEmail, error, clearError, loading } = useAuth();
//   const router = useRouter();

//   // Redirect if no email is provided
//   useEffect(() => {
//     if (!email) {
//       router.push("/signup");
//     }
//   }, [email, router]);

//   // Countdown timer
//   useEffect(() => {
//     if (countdown <= 0) return;
    
//     const timer = setTimeout(() => {
//       setCountdown(countdown - 1);
//     }, 1000);
    
//     return () => clearTimeout(timer);
//   }, [countdown]);

//   // Format time as MM:SS
//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
//   };

//   const handleVerify = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!email) return;
    
//     clearError();
//     const success = await verifyOTP(email, otp);
    
//     if (success) {
//       // Verification successful - the redirect will be handled in verifyOTP function
//       // Just in case, we'll add a fallback
//       setTimeout(() => {
//         if (window.location.pathname.includes("verify-email")) {
//           router.push("/dashboard");
//         }
//       }, 2000);
//     }
//   };

//   const handleResendOTP = async () => {
//     if (!email || isResending) return;
    
//     setIsResending(true);
//     clearError();
//     const success = await sendOTPEmail(email);
    
//     if (success) {
//       setCountdown(300); // Reset countdown
//     }
    
//     setIsResending(false);
//   };

//   return (
//     <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
//       <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-md">
//         <div className="text-center">
//           <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
//             Verify Your Email
//           </h2>
//           <p className="mt-2 text-sm text-gray-600">
//             We&apos;ve sent a verification code to{" "}
//             <span className="font-medium">{email}</span>
//           </p>
//         </div>
        
//         <form className="mt-8 space-y-6" onSubmit={handleVerify}>
//           <div>
//             <label htmlFor="otp" className="sr-only">
//               Verification Code
//             </label>
//             <input
//               id="otp"
//               name="otp"
//               type="text"
//               required
//               className="relative block w-full rounded-md border-0 py-3 text-center text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-2xl tracking-widest"
//               placeholder="000000"
//               value={otp}
//               onChange={(e) => setOtp(e.target.value.slice(0, 6))}
//               maxLength={6}
//             />
//           </div>

//           {error && (
//             <div className="rounded-md bg-red-50 p-4">
//               <div className="text-sm text-red-700">{error}</div>
//             </div>
//           )}

//           <div>
//             <button
//               type="submit"
//               disabled={loading || otp.length !== 6}
//               className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300"
//             >
//               {loading ? "Verifying..." : "Verify Email"}
//             </button>
//           </div>
//         </form>

//         <div className="mt-4 text-center">
//           <p className="text-sm text-gray-600">
//             Code expires in{" "}
//             <span className="font-medium">{formatTime(countdown)}</span>
//           </p>
//           <button
//             type="button"
//             onClick={handleResendOTP}
//             disabled={isResending || countdown > 0}
//             className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400"
//           >
//             {isResending ? "Sending..." : countdown > 0 ? "Resend code after countdown" : "Resend Code"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }