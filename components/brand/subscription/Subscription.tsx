"use client";

import React from "react";
import {
	User,
	Trophy,
	MessageCircle,
	Play,
	Smile,
	Clock,
	CheckCircle,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "../../ui/button";
import Link from "next/link";

const PricingPage = () => {
	return (
		<div className="min-h-screen bg-gray-50 font-satoshi">
			{/* Section 1: Main Pricing Cards */}
			<div className="py-16 px-4">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-12">
						<h1 className="text-3xl font-bold text-gray-900 mb-3">
							Create More, Spend Less with AI-Powered UGC
						</h1>
						<p className="text-lg text-gray-600 mb-5">
							Create custom AI avatars, manage creator campaigns, and scale your
							brand — all from one platform.
						</p>
						<Button
							onClick={() =>
								document.getElementById("compare-plans")
									?.scrollIntoView({ behavior: "smooth" })
							}
							className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium inline-flex items-center gap-2"
						>
							Learn More
							<span>→</span>
						</Button>
					</div>

					<div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
						{/* Basic Plan */}
						<div className="bg-white border border-[#00000014] rounded-2xl overflow-hidden shadow-sm p-8 h-fit">
							<div className="flex justify-center mb-6">
								<Badge
									variant="outline"
									className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
								>
									<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
									Basic Plan
								</Badge>
							</div>

							<div className="mb-8">
								<div className="flex justify-center items-baseline gap-2">
									<span className="text-5xl font-medium text-gray-900">
										FREE
									</span>
									<span className="text-gray-500">/ 7 Days</span>
								</div>
								<p className="text-gray-500 mt-2 text-center">Then $99/month</p>
							</div>

							<div className="space-y-4 mb-8">
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">
										Creator Marketplace Access
									</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">Priority Support</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">10 AI Videos / Month</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">
										Generate 1 Custom AI Actor
									</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">
										Access 300+ Natural AI Actors
									</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">2 Minute Wait Time</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">AI Reactions</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">Use 35 Languages</span>
								</div>
								<div className="flex items-center gap-3 opacity-50">
									<XCircle className="w-5 h-5 text-gray-600" />
									<span className="text-gray-600">
										Play Videos Upto 90 Seconds
									</span>
								</div>
							</div>

							<Link href="/brand/signup-complete">
								<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium">
									Start Free Trial
								</Button>
							</Link>
						</div>

						{/* Starter Plan - Most Popular */}
						<div className="bg-white border border-[#FD5C02] rounded-2xl overflow-hidden shadow-sm relative h-fit">
							<div className="bg-[#FC52E4] text-sm text-white py-2.5 text-center font-medium uppercase">
								Most Popular
							</div>
							<div className="p-8">
								<div className="flex justify-center mb-6">
									<Badge
										variant="outline"
										className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
									>
										<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
										Starter Plan
									</Badge>
								</div>

								<div className="mb-8 text-center">
									<div className="flex justify-center text-center items-baseline gap-2">
										<span className="text-5xl font-medium text-gray-900 ">
											$170
										</span>
										<span className="text-gray-500">/ Month</span>
									</div>
									<p className="text-gray-500 mt-2">
										Perfect for brands trying AI-powered content for the first
										time.
									</p>
								</div>

								<div className="space-y-4 mb-8">
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">
											Creator Marketplace Access
										</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">10 AI Videos / Month</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">
											Generate 1 Custom AI Actor
										</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">
											Access 300+ Natural AI Actors
										</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">2 Minute Wait Time</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">AI Reactions</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">Use 35 Languages</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">
											Play Videos Upto 90 Seconds
										</span>
									</div>
									<div className="flex items-center gap-3">
										<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
										<span className="text-gray-700">Priority Support</span>
									</div>
								</div>

								<Link href="/brand/signup-complete">
									<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium">
										Buy Now
									</Button>
								</Link>
							</div>
						</div>

						{/* Growth Plan */}
						<div className="bg-white border border-[#00000014] rounded-2xl overflow-hidden shadow-sm p-8 h-fit">
							<div className="flex justify-center mb-6">
								<Badge
									variant="outline"
									className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
								>
									<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
									Growth Plan
								</Badge>
							</div>

							<div className="mb-8">
								<div className="flex justify-center items-baseline gap-2">
									<span className="text-5xl font-medium text-gray-900">
										$340
									</span>
									<span className="text-gray-500">/ Month</span>
								</div>
								<p className="text-gray-500 mt-2 text-center">
									Ideal for scaling brands that need consistent creative output.
								</p>
							</div>

							<div className="space-y-4 mb-8">
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">
										Creator Marketplace Access
									</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">20 AI Videos / Month</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">
										Generate 3 Custom AI Actors
									</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">
										Access 300+ Natural AI Actors
									</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">2 Minutes wait time</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">AI Reactions</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">Use 35 Languages</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">
										Play Videos up to 90 secs
									</span>
								</div>
								<div className="flex items-center gap-3">
									<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
									<span className="text-gray-700">Priority Support</span>
								</div>
							</div>

							<Link href="/brand/signup-complete">
								<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium">
									Buy Now
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Section 2: Scale Plan */}
			<div className="py-16 px-4 bg-black">
				<div className="max-w-6xl mx-auto">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div>
							<div className="flex items-center gap-2 mb-6">
								<Badge
									variant="outline"
									className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
								>
									<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
									Scale Plan
								</Badge>
							</div>

							<h2 className="text-4xl font-medium text-white mb-2">Custom</h2>
							<p className="text-gray-300 text-base mb-5">
								Built for agencies and content-heavy brands with high demand.
							</p>

							<Link href="/contact-us">
								<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md font-medium">
									Contact Us
								</Button>
							</Link>
						</div>

						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">Creator Marketplace Access</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">Unlimited AI Videos / Month</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">
									Generate Unlimited Custom AI Actors
								</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">
									Access 300+ Natural AI Actors
								</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">2 Minutes wait time</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">AI Reactions</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">Use 35 Languages</span>
							</div>
							<div className="flex items-center gap-3">
								<CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
								<span className="text-white">Play Videos up to 90 secs</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Section 3: Compare Plans & Features */}
			<div id="compare-plans" className="py-16 px-4 bg-white">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-2xl font-medium text-gray-900 mb-1">
							Compare Plans & Features
						</h2>
						<p className="text-base text-gray-600">
							See what&apos;s included in each plan to find the best fit for
							your brand&apos;s UGC strategy.
						</p>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full border border-gray-200 rounded-xl">
							<thead>
								<tr className="border-b border-gray-200">
									<th className="text-left p-6 w-1/3"></th>
									<th className="text-center p-6 w-1/6">
										<div className="flex justify-center items-center gap-2 mb-6">
											<Badge
												variant="outline"
												className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
											>
												<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
												Basic Plan
											</Badge>
										</div>
										<div className="text-3xl font-medium text-gray-900">
											FREE
										</div>
										<div className="text-gray-600 font-light">/ 7 Days</div>
									</th>
									<th className="text-center p-6 w-1/6">
										<div className="flex justify-center  items-center gap-2 mb-6">
											<Badge
												variant="outline"
												className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
											>
												<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
												Starter Plan
											</Badge>
										</div>
										<div className="text-3xl font-medium text-gray-900">
											$170
										</div>
										<div className="text-gray-600 font-light">/ Month</div>
									</th>
									<th className="text-center p-6 w-1/6">
										<div className="flex justify-center items-center gap-2 mb-6">
											<Badge
												variant="outline"
												className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
											>
												<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
												Growth Plan
											</Badge>
										</div>
										<div className="text-3xl font-medium text-gray-900">
											$340
										</div>
										<div className="text-gray-600 font-light">/ Month</div>
									</th>
									<th className="text-center p-6 w-1/6">
										<div className="flex justify-center items-center gap-2 mb-6">
											<Badge
												variant="outline"
												className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
											>
												<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
												Scale Plan
											</Badge>
										</div>
										<div className="text-3xl font-medium text-gray-900">
											Custom
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr className="border-b border-gray-100">
									<td className="p-4 bg-gray-50 font-medium text-gray-600 text-sm">
										CREATOR MARKETPLACE ACCESS
									</td>
									<td className="p-4"></td>
									<td className="p-4"></td>
									<td className="p-4"></td>
									<td className="p-4"></td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<User className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">Project Campaigns</span>
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<Trophy className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">
											Contests (Coming Soon)
										</span>
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<MessageCircle className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">
											Messaging & Content Review
										</span>
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 bg-gray-50 font-medium text-gray-600 text-sm">
										AI VIDEOS
									</td>
									<td className="p-4"></td>
									<td className="p-4"></td>
									<td className="p-4"></td>
									<td className="p-4"></td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<Play className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">AI Videos/Month</span>
									</td>
									<td className="p-4 text-center">
										<XCircle className="w-5 h-5 text-gray-400 mx-auto" />
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										10 Videos
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										20 Videos
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										Unlimited Videos
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<User className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">Custom AI Actor</span>
									</td>
									<td className="p-4 text-center">
										<XCircle className="w-5 h-5 text-gray-400 mx-auto" />
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										1 Actor
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										3 Actor
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										Unlimited Actors
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<User className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">Natural AI Actors</span>
									</td>
									<td className="p-4 text-center">
										<XCircle className="w-5 h-5 text-gray-400 mx-auto" />
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										300 Actors
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										300 Actors
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										300 Actors
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<Smile className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">AI Reactions</span>
									</td>
									<td className="p-4 text-center">
										<XCircle className="w-5 h-5 text-gray-400 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
									<td className="p-4 text-center">
										<CheckCircle className="w-5 h-5 text-orange-500 mx-auto" />
									</td>
								</tr>
								<tr className="border-b border-gray-100">
									<td className="p-4 flex items-center gap-3">
										<Clock className="w-5 h-5 text-gray-600" />
										<span className="text-gray-700">Video Length</span>
									</td>
									<td className="p-4 text-center">
										<XCircle className="w-5 h-5 text-gray-400 mx-auto" />
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										Up to 90 Secs
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										Up to 90 Secs
									</td>
									<td className="p-4 text-center text-gray-700 font-medium">
										Up to 90 Secs
									</td>
								</tr>

								<tr>
									<td className="p-4"></td>
									<td className="p-4 text-center">
										<Link href="/brand/signup-complete">
											<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium">
												Start Free Trial
											</Button>
										</Link>
									</td>
									<td className="p-4 text-center">
										<Link href="/brand/signup-complete">
											<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium">
												Buy Now
											</Button>
										</Link>
									</td>
									<td className="p-4 text-center">
										<Link href="/brand/signup-complete">
											<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium">
												Buy Now
											</Button>
										</Link>
									</td>
									<td className="p-4 text-center">
										<Link href="/brand/signup-complete">
											<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-medium">
												Contact Us
											</Button>
										</Link>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PricingPage;
