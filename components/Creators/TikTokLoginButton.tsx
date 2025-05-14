import React from 'react';

export default function TikTokLoginButton() {
  return (
    <a 
      href="/api/auth/tiktok/login" 
      className="tiktok-login-button"
    >
      Continue with TikTok
    </a>
  );
}