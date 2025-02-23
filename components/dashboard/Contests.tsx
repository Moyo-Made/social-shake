import React from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import Link from "next/link";
import SideNavLayout from "./SideNav";

const EmptyContest = () => {
	return (
    <SideNavLayout>
		<div className="font-satoshi">
			<main className="p-6 mt-12">
				<div className="flex flex-col justify-center items-center max-w-md mx-auto text-center">
					<Image
						src="/images/empty-contest.png"
						alt="Empty Contest"
						width={400}
						height={400}
						className="mb-4"
					/>
					<h2 className="text-2xl font-semibold mb-2">No Contests Yet!</h2>
					<p className="text-gray-600 mb-4">
						Engage top creators and spark viral campaigns! Start a contest, set
						your requirements, and let creators compete to promote your brand.
					</p>
					<Link href="/dashboard/new-contest">
						<Button className="bg-[#FD5C02] text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
							Create Your First Contest <span className="text-lg mb-px">+</span>
						</Button>
					</Link>
				</div>
			</main>
		</div>
    </SideNavLayout>
	);
};

export default EmptyContest;
