import { useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { faqData } from "@/types/faq";

export default function FAQComponent() {
	const [searchQuery, setSearchQuery] = useState("");

	// Filter FAQs based on search query
	const filteredFaqs = faqData.filter(
		(faq) =>
			searchQuery === "" ||
			faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(faq.answer &&
				typeof faq.answer === "string" &&
				faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	return (
		<div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg">
			<h1 className="text-2xl font-bold text-center mb-8">
				How can we help you today?
			</h1>

			<div className="relative mb-8  mx-auto w-1/2">
				<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
					<Search className="h-5 w-5 text-gray-400" />
				</div>
				<Input
					type="text"
					placeholder="Search for Answers..."
					className="pl-10 pr-4 py-2 border rounded-md "
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			<Accordion type="multiple" className="space-y-4">
				{filteredFaqs.map((faq) => (
					<AccordionItem
						key={faq.id}
						value={faq.id}
						className="bg-[#FFF4EE] rounded-lg overflow-hidden"
					>
						<AccordionTrigger className="px-6 py-4 text-base font-medium hover:no-underline hover:bg-opacity-50 data-[state=open]:bg-opacity-50">
							{faq.question}
						</AccordionTrigger>
						<AccordionContent className="px-6 pb-4 pt-2 text-base border-t border-[#6670854D]">
							{faq.answer}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}
