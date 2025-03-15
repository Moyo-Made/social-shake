import Image from "next/image";
import Link from "next/link";
import React from "react";

const Footer = () => {
	return (
		<footer className="fixed bottom-0 left-0 w-full py-3 md:py-4 bg-white border-t border-gray-200 shadow-sm z-10">
			<div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
				<p className="text-xs sm:text-sm md:text-base text-[#000] mb-2 sm:mb-0 text-center sm:text-left">
					© 2025 Social Shake. All rights reserved.
				</p>
				<div className="flex space-x-4 md:space-x-5">
					<Link href="" className="hover:opacity-75 transition-opacity">
						<Image
							src="/icons/ig.svg"
							alt="Instagram"
							width={20}
							height={20}
						/>
					</Link>
					<Link href="" className="hover:opacity-75 transition-opacity">
						<Image 
                            src="/icons/x.svg" 
                            alt="Twitter" 
                            width={20} 
                            height={20} 
                        />
					</Link>
					<Link href="" className="hover:opacity-75 transition-opacity">
						<Image
							src="/icons/tiktok.svg"
							alt="Tiktok"
							width={20}
							height={20}
						/>
					</Link>
				</div>
			</div>
		</footer>
	);
};

export default Footer;