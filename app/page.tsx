"use client"

import { useState } from 'react';
import { UserCircle, Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupOptions() {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  
  const handleMouseEnter = (buttonType: string) => {
    setHoveredButton(buttonType);
  };
  
  const handleMouseLeave = () => {
    setHoveredButton(null);
  };
  
  return (
    <div className="flex flex-col justify-center items-center p-8 bg-gray-50 rounded-lg shadow-sm max-w-2xl mx-auto font-satoshi mt-40">
      <Link href="/" className="flex items-center">
				<Image
					src="/images/logo.svg"
					alt="Social Shake logo"
					width={100}
					height={100}
				/>
			</Link>
      <h2 className="text-3xl font-bold mt-8 mb-2 text-gray-800">Join Social Shake!</h2>
      <p className="text-gray-600 mb-8 text-center">Choose how you want to join us and start connecting</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Creator Button */}
        <Link href="/brand/creator" className="flex items-center">
        <button 
          className={`group relative flex items-center justify-between p-6 rounded-lg transition-all duration-300 ${
            hoveredButton === 'creator' 
              ? 'bg-orange-600 transform -translate-y-1'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
          onMouseEnter={() => handleMouseEnter('creator')}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center">
            <UserCircle className="text-white mr-3" size={24} />
            <div className="text-left">
              <span className="block text-white font-semibold text-lg">Sign up as a Creator</span>
              <span className="block text-orange-100 text-sm mt-1">Share your content and grow your audience</span>
            </div>
          </div>
          <ArrowRight className={`text-white transition-transform duration-300 ${
            hoveredButton === 'creator' ? 'transform translate-x-1' : ''
          }`} size={20} />
        </button>
        </Link>
        {/* Brand Button */}
        <Link href="/brand/signup" className="flex items-center">
        <button 
          className={`group relative flex items-center justify-between p-6 rounded-lg transition-all duration-300 ${
            hoveredButton === 'brand' 
              ? 'bg-orange-600 transform -translate-y-1'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
          onMouseEnter={() => handleMouseEnter('brand')}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center">
            <Briefcase className="text-white mr-3" size={24} />
            <div className="text-left">
              <span className="block text-white font-semibold text-lg">Sign up as a Brand</span>
              <span className="block text-orange-100 text-sm mt-1">Connect with creators and launch campaigns</span>
            </div>
          </div>
          <ArrowRight className={`text-white transition-transform duration-300 ${
            hoveredButton === 'brand' ? 'transform translate-x-1' : ''
          }`} size={20} />
        </button>
        </Link>
      </div>
    
    </div>
  );
}