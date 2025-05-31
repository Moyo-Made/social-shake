import React from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import Link  from "next/link";

const Navbar = () => {
	return (
		<nav className="w-full px-4 md:px-12 lg:px-16 py-4 flex justify-between items-center border-b border-[#667085]">
			<Link href="/" className="flex items-center">
				<Image
					src="/images/logo.svg"
					alt="Social Shake logo"
					width={80}
					height={80}
				/>
			</Link>
			<Link href="/contact-us">

			<Button
				variant="outline"
				className="bg-[#1A1A1A] text-sm md:text-base text-white rounded-lg px-4 md:px-6 py-4 hover:bg-black hover:text-white font-satoshi"
			>
				Contact Us
			</Button>
			</Link>
		</nav>
	);
};

export default Navbar;
