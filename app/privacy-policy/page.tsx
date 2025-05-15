import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-satoshi">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-orange-500 px-6 py-8">
          <h1 className="text-3xl font-bold text-white text-center">Privacy Policy</h1>
          <p className="text-white text-center mt-2">
            Last Updated: 3 February 2025 | Effective Date: 3 February 2025
          </p>
        </div>
        
        <div className="px-6 py-8">
          <p className="text-gray-700 mb-6">
            At Social Shake (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), we are committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our app, 
            Social Shake, including all contests, social media features, and any other services offered (collectively, the &quot;Services&quot;). 
            Please read this Privacy Policy carefully to understand how we handle your personal data.
          </p>
          
          <p className="text-gray-700 mb-6">
            By using the Social Shake app, you agree to the practices outlined in this Privacy Policy.
          </p>
          
          <div className="bg-orange-50 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold text-orange-600 mb-4">Key Summary</h2>
            <p className="text-gray-700 mb-4">
              This Privacy Policy outlines how Social Shake collects, uses, and protects your personal information. 
              By using our app, you agree to the following key points:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><span className="font-medium">What We Collect:</span> We collect personal information such as your name, email address, and social media details, as well as usage data like device information, location, and browsing behavior.</li>
              <li><span className="font-medium">How We Use It:</span> Your information is used to create and manage your account, administer contests, personalize your experience, and communicate with you. It may also be used for legal compliance or improving our services.</li>
              <li><span className="font-medium">How We Share It:</span> We may share your data with third-party service providers, contest partners, and in certain legal circumstances.</li>
              <li><span className="font-medium">Your Rights:</span> You have rights to access, correct, delete, or limit the use of your data. You can also opt out of marketing communications.</li>
              <li><span className="font-medium">Data Security:</span> We take reasonable measures to protect your data but cannot guarantee complete security due to internet transmission risks.</li>
              <li><span className="font-medium">International Transfers:</span> Your data may be transferred to servers outside of your country.</li>
              <li><span className="font-medium">Children&apos;s Privacy:</span> Our services are not intended for children under 13, and we do not knowingly collect their personal information.</li>
            </ul>
            <p className="text-gray-700 mt-4">For detailed information, please review the full Privacy Policy below.</p>
          </div>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 mb-4">We collect two types of information:</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
            <p className="text-gray-700 mb-3">
              Personal information refers to information that can identify you as an individual. This may include:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><span className="font-medium">Account Information:</span> When you create an account, we collect details like your name, email address, username, and profile picture.</li>
              <li><span className="font-medium">Contact Information:</span> You may provide us with your phone number or address when participating in contests or other activities.</li>
              <li><span className="font-medium">Social Media Account Information:</span> If you link your Social Shake account with your social media profiles (e.g., Facebook, Instagram), we may collect information from those accounts such as your social media handle, followers, posts, or shared content.</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Usage and Device Information</h3>
            <p className="text-gray-700 mb-3">
              We also collect non-personal information related to your use of the app, such as:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><span className="font-medium">Log Data:</span> Information such as your IP address, device type, browser type, operating system, and interactions with the app (e.g., pages visited, actions taken).</li>
              <li><span className="font-medium">Location Information:</span> We may collect your device&apos;s location data if you allow location-based features to function (e.g., location tagging in posts).</li>
              <li><span className="font-medium">Cookies and Tracking Technologies:</span> We use cookies and similar technologies to enhance your experience and collect data about usage patterns. You can control cookies through your browser settings.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><span className="font-medium">Account Creation and Management:</span> To create and manage your account, customize your experience, and provide customer support.</li>
              <li><span className="font-medium">Contests and Promotions:</span> To administer contests, giveaways, or promotions that you participate in, including selecting winners and communicating with participants.</li>
              <li><span className="font-medium">Personalization:</span> To personalize your experience and offer content, ads, or promotions that may be of interest to you.</li>
              <li><span className="font-medium">Improvement of Services:</span> To improve the functionality, design, and features of the Social Shake app based on your feedback and usage patterns.</li>
              <li><span className="font-medium">Communication:</span> To send you updates, notifications, and promotional messages, unless you opt out.</li>
              <li><span className="font-medium">Legal Compliance:</span> To comply with legal obligations or protect our rights, privacy, safety, and property, as well as that of our users.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">3. Sharing Your Information</h2>
            <p className="text-gray-700 mb-3">
              We may share your information in the following ways:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><span className="font-medium">With Service Providers:</span> We may share your data with third-party service providers who help us operate the app (e.g., hosting, analytics, payment processing).</li>
              <li><span className="font-medium">With Contest Partners:</span> If you enter a contest, we may share your information with third-party sponsors or partners for the purposes of administering and fulfilling the contest.</li>
              <li><span className="font-medium">Legal Requirements:</span> We may disclose your information if required by law or to respond to a legal request, such as a subpoena or court order.</li>
              <li><span className="font-medium">Business Transfers:</span> In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">4. Your Data Rights and Choices</h2>
            <p className="text-gray-700 mb-3">
              You have certain rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><span className="font-medium">Access and Correction:</span> You can request access to the personal data we hold about you and request corrections if the information is inaccurate.</li>
              <li><span className="font-medium">Opt-out of Marketing Communications:</span> You can opt-out of receiving promotional emails by following the unsubscribe instructions in the email or adjusting your notification settings within the app.</li>
              <li><span className="font-medium">Delete Your Account:</span> You can delete your account at any time through the app settings. Deleting your account will remove most of your personal information from the platform, although some information may be retained for legal or operational reasons.</li>
              <li><span className="font-medium">Cookie Preferences:</span> You can manage cookies through your browser settings or opt-out of targeted ads via industry opt-out tools.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">5. Data Security</h2>
            <p className="text-gray-700">
              We take reasonable measures to protect your information from unauthorized access, alteration, or disclosure. 
              However, no method of transmission over the internet or method of electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee absolute security.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">6. International Data Transfers</h2>
            <p className="text-gray-700">
              Your information may be transferred to and maintained on servers located outside of your country of residence. 
              By using our app, you consent to the transfer of your information to locations outside of your country, which may have different data protection laws than your home country.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">7. Children&apos;s Privacy</h2>
            <p className="text-gray-700">
              Social Shake is not intended for children under the age of 13. We do not knowingly collect or solicit personal 
              information from children under 13. If we learn that we have inadvertently collected personal information from a child under 13, 
              we will take steps to delete that information as soon as possible.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">8. GDPR Rights (For Users in the European Union)</h2>
            <p className="text-gray-700 mb-4">
              If you are located in the European Union (EU), your personal data is protected under the General Data Protection Regulation (GDPR). 
              The GDPR provides you with several rights regarding your personal data, including the following:
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Your Rights Under the GDPR</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li><span className="font-medium">Right to Access:</span> You have the right to request access to the personal data we hold about you. This includes information about how we use your data, who we share it with, and how long we retain it.</li>
              <li><span className="font-medium">Right to Rectification:</span> If your personal data is inaccurate or incomplete, you have the right to request that we correct or update it.</li>
              <li><span className="font-medium">Right to Erasure (Right to be Forgotten):</span> You have the right to request the deletion of your personal data in certain circumstances, such as if the data is no longer necessary for the purposes for which it was collected or if you withdraw consent.</li>
              <li><span className="font-medium">Right to Restrict Processing:</span> You can request that we limit the processing of your personal data in specific situations, such as when you contest the accuracy of the data or if you object to the processing based on legitimate interests.</li>
              <li><span className="font-medium">Right to Data Portability:</span> You have the right to request a copy of your personal data in a structured, commonly used, and machine-readable format. You can transfer this data to another service provider if you wish.</li>
              <li><span className="font-medium">Right to Object:</span> You can object to the processing of your personal data in certain cases, such as when we process data for direct marketing purposes or if processing is based on our legitimate interests.</li>
              <li><span className="font-medium">Right to Withdraw Consent:</span> If we rely on your consent to process your personal data, you have the right to withdraw that consent at any time. This will not affect the lawfulness of processing based on consent before its withdrawal.</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">How to Exercise Your GDPR Rights</h3>
            <p className="text-gray-700 mb-4">
              To exercise any of the rights listed above, please contact us at:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Email: [Insert contact email]</li>
              <li>Mailing Address: [Insert address]</li>
              <li>Phone: [Insert phone number]</li>
            </ul>
            <p className="text-gray-700 mb-4">
              We will respond to your request in accordance with applicable data protection laws. 
              Please note that some rights may be limited in certain circumstances, such as when we need to retain data for legal or contractual reasons.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Right to Lodge a Complaint</h3>
            <p className="text-gray-700">
              If you believe that we have not adequately addressed your concerns or complied with the GDPR, 
              you have the right to lodge a complaint with a supervisory authority in your country of residence. 
              You can find more information about the relevant supervisory authority in the EU here.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">9. Changes to This Privacy Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated &quot;Effective Date&quot; at the top. 
              We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-orange-600 mb-4">10. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions or concerns about this Privacy Policy or how we handle your personal data, please contact us at:
            </p>
            <p className="text-gray-700 font-medium mt-2">
              Email: info@social-shake.com
            </p>
          </section>
        </div>
        
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
          <p className="text-gray-600 text-center text-sm">
            © {new Date().getFullYear()} Social Shake. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;