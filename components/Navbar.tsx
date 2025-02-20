import React from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import Link  from "next/link";

const Navbar = () => {
	return (
		<nav className="w-full px-4 md:px-12 lg:px-16 py-4 flex justify-between items-center">
			<Link href="/" className="flex items-center">
				<Image
					src="/images/logo.svg"
					alt="Social Shake logo"
					width={100}
					height={100}
				/>
			</Link>
			<Button
				variant="outline"
				className="bg-[#1A1A1A] text-sm md:text-base text-white rounded-lg px-4 md:px-7 py-5 hover:bg-black hover:text-white font-satoshi"
			>
				Contact Us
			</Button>
		</nav>
	);
};

export default Navbar;
