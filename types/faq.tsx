import Link from "next/link";

export 
const faqData = [
	{
		id: "what-is-social-shake",
		question: "What is Social Shake?",
		answer:
			"Social Shake is a platform that connects brands with creators to produce authentic user-generated content (UGC) for marketing purposes. It serves as a marketplace where businesses can collaborate with influencers and content creators to generate engaging content that resonates with their target audience.",
	},
	{
		id: "how-creators-get-paid",
		question: "How do creators get paid?",
		answer:
			"Creators on Social Shake are compensated upon the completion and approval of their content submissions. Once a brand commissions a creator—either by direct selection or through the acceptance of a pitch— Social Shake deducts the agreed-upon amount from the brand's account and transfers the payment to the creator.",
	},
	{
		id: "types-of-collaborations",
		question: "What types of collaborations are available on Social Shake?",
		answer: (
			<>
				On Social Shake, creators can engage in various types of
				collaborations with brands to produce authentic and impactful content.
				Here are the primary collaboration opportunities available:
				<br />
				<br />
				<strong>1. Influencer Posting</strong>
				<br />
				Creators produce content, such as videos or photos, and share it
				directly on their Instagram or TikTok accounts. This approach
				leverages the creator&apos;s established audience and engagement to
				promote the brand&apos;s products or services.
				<br />
				<br />
				<strong>2. User-Generated Content (UGC)</strong>
				<br />
				Creators develop content—videos, photos, or reviews—that brands can
				utilize for their marketing campaigns. This content is typically not
				shared on the creator&apos;s personal social media but is provided to
				the brand for use across various platforms.
				<br />
				<br />
				<strong>3. Product Seeding</strong>
				<br />
				Brands send products to creators for review. This collaboration allows
				creators to try out the products and share their genuine experiences,
				often leading to authentic content that resonates with their audience.
				<br />
				<br />
				<strong>4. Partnership Ads</strong>
				<br />
				Creators produce content that brands then promote through paid
				advertisements on platforms like Meta (Facebook/Instagram) or TikTok.
				This strategy amplifies the reach of the content beyond the
				creator&apos;s organic audience.
				<br />
				<br />
				<strong>5. TikTok Spark Ads</strong>
				<br />
				Creators develop high-quality content that brands can transform into
				Spark Ads on TikTok. These ads appear as native content within
				users&apos; feeds, enhancing engagement and authenticity.
			</>
		),
	},
	{
		id: "join-as-creator",
		question: "How do I join Social Shake as a creator?",
		answer: (
			<>
				To join Social Shake as a creator, follow these steps:
				<br />
				<strong>Sign Up:</strong> Visit the{" "}
				<Link
					href="https://social-shake.vercel.app/"
					className="text-blue-600 underline"
				>
					Social Shake Creators page
				</Link>{" "}
				and click on “Sign up as a Creator”. You&apos;ll need to provide basic
				information such as your name, email, and social media profiles.
				<br />
				<strong>Profile Setup:</strong> Complete your profile by uploading
				requested information, including your portfolio videos. This helps
				brands understand your style and reach.
				<br />
				<strong>Approval Process:</strong> Once your profile is submitted,
				Social Shake will review it. Upon approval, you&apos;ll gain access to
				the platform and can start applying for campaigns.
				<br />
				<strong>Start Collaborating:</strong> Browse available campaigns,
				submit pitches, and collaborate with brands to create engaging
				content.
			</>
		),
		defaultOpen: true,
	},
	{
		id: "join-as-brand",
		question: "How do I join Social Shake as a brand?",
		answer: (
			<>
				To launch a campaign as a brand on Social Shake, follow these
				streamlined steps:
				<br />
				<br />
				<strong>1. Create an Account</strong>
				<br />
				Sign up for free on the Social Shake Brands page. The platform is
				designed to be user-friendly, allowing you to get started quickly.
				<br />
				<br />
				<strong>2. Post Your Campaign Brief</strong>
				<br />
				Once registered, you can post a campaign brief detailing:
				<br />- <strong>Campaign Goals:</strong> Specify what you aim to
				achieve.
				<br />- <strong>Target Audience:</strong> Define who the content
				should resonate with.
				<br />- <strong>Content Requirements:</strong> Outline the type of
				content you&apos;re seeking (e.g., videos, photos).
				<br />- <strong>Compensation:</strong> State the payment or incentives
				offered to creators.
				<br />
				<br />
				<strong>3. Review Creator Applications</strong>
				<br />
				After posting your brief, creators will apply by submitting their
				pitches or portfolios. You can review these applications and select
				the creators whose style and audience align with your brand&apos;s
				objectives.
				<br />
				<br />
				<strong>4. Ship Products (if applicable)</strong>
				<br />
				For campaigns requiring product reviews or demonstrations, coordinate
				with selected creators to ship your products. Ensure timely delivery
				to allow creators to produce content within the agreed-upon timeframe.
				<br />
				<br />
				<strong>5. Receive and Utilize Content</strong>
				<br />
				Creators will deliver the agreed-upon content, typically within 10
				days. You can then use this content across your marketing channels,
				such as social media, websites, or advertisements.
			</>
		),
		defaultOpen: true,
	},
];