import Image from "next/image";
import Link from "next/link";
import React from "react";

const Footer = () => {
	return (
		<div>
			<footer className="fixed bottom-0 w-full py-4 bg-white">
				<div className="container mx-0 lg:mx-auto px-4 flex justify-between items-center">
					<p className="text-sm md:text-base text-[#000]">
					© 2025 Social Shake. All rights reserved.
					</p>
					<div className="flex space-x-3 md:space-x-5">
						<Link href="">
							<Image
								src="/icons/ig.png"
								alt="Instagram"
								width={20}
								height={20}
							/>
						</Link>
						<Link href="">
							<Image src="/icons/x.svg" alt="Twitter" width={20} height={20} />
						</Link>
						<Link href="">
							<Image
								src="/icons/tiktok.png"
								alt="Tiktok"
								width={20}
								height={20}
							/>
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Footer;
