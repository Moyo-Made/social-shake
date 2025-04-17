import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

const PricingCard = () => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10 font-satoshi overflow-y-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold mb-3">
          Choose Your Brand Package
        </h1>
        <p className="text-base">
          Select the package that best fits your brand&apos;s needs and goals.
          All packages include our core services.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start mb-16">
        {/* Starter Plan */}
        <div className="bg-white border border-[#00000014] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-6">
            <div className="flex justify-center mb-6">
              <Badge
                variant="outline"
                className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
              >
                <span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
                Starter Plan
              </Badge>
            </div>
            <div className="mb-5">
              <h2 className="text-4xl font-medium mb-3 text-center">$500</h2>
              <p className="text-gray-600 text-center">
                Perfect for small brands testing UGC. Get a few high-quality
                videos and run a contest to boost engagement.
              </p>
            </div>
            <div className="h-px bg-[#E9EAEB] mb-6" />
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>5 Video Requests</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>1 Contest</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>3 Video Revisions</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>Standard Support</span>
              </div>
            </div>
            <div className="h-px bg-[#E9EAEB] mb-6" />
            <Link href="/brand/dashboard">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5">
                Get started
              </Button>
            </Link>
          </div>
        </div>

        {/* Growth Plan */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm relative">
          <div className="bg-[#FC52E4] text-sm text-white py-2.5 text-center font-medium uppercase">
            Most Popular
          </div>
          <div className="px-6 py-6">
            <div className="flex justify-center mb-6">
              <Badge
                variant="outline"
                className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
              >
                <span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
                Growth Plan
              </Badge>
            </div>
            <div className="mb-5">
              <h2 className="text-4xl font-medium mb-3 text-center">$1,500</h2>
              <p className="text-gray-600 text-center">
                Ideal for scaling brands looking for more exposure. Run multiple
                contests and get more creator content.
              </p>
            </div>
            <div className="h-px bg-[#E9EAEB] mb-6" />
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>15 Video Requests</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>3 Contest</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>5 Video Revisions</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>Standard Support</span>
              </div>
            </div>
            <div className="h-px bg-[#E9EAEB] mb-6" />
            <Link href="/brand/dashboard">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5">
                Get started
              </Button>
            </Link>
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-6">
            <div className="flex justify-center mb-6">
              <Badge
                variant="outline"
                className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
              >
                <span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
                Enterprise Plan
              </Badge>
            </div>
            <div className="mb-5">
              <h2 className="text-4xl font-medium mb-3 text-center">Custom Pricing</h2>
              <p className="text-gray-600 text-center">
                For established brands needing unlimited content, priority
                creators, and advanced insights to maximize ROI.
              </p>
            </div>
            <div className="h-px bg-[#E9EAEB] mb-6" />
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>Unlimited Videos</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>10 Contests</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>Unlimited Revisions</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="text-orange-500 mr-3 h-5 w-5 flex-shrink-0" />
                <span>Premium Support</span>
              </div>
            </div>
            <div className="h-px bg-[#E9EAEB] mb-6" />
            <Link href="/brand/dashboard">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCard;