import { Card, CardContent } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <Card>
          <CardContent className="prose prose-invert max-w-none p-6">
            <p className="text-lg mb-6">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p>
                By accessing or using Remevi, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
              <p>Permission is granted to temporarily access the materials (information or software) on Remevi&apos;s website for personal, non-commercial transitory viewing only.</p>
              <p className="mt-4">This license shall automatically terminate if you violate any of these restrictions and may be terminated by Remevi at any time.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p>When you create an account with us, you must provide accurate and complete information. You are responsible for maintaining the security of your account and password.</p>
              <ul className="list-disc pl-6 mt-2">
                <li>You must be at least 13 years old to use this service</li>
                <li>You are responsible for all activities under your account</li>
                <li>You must notify us of any security breach</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Service Usage and Limits</h2>
              <p>Free accounts are limited to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>10 uploads per month</li>
                <li>Basic features and functionality</li>
                <li>Standard support</li>
              </ul>
              <p className="mt-4">Premium features are available through our paid plans.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Content Guidelines</h2>
              <p>You agree not to upload content that:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Infringes on intellectual property rights</li>
                <li>Contains malicious code or viruses</li>
                <li>Violates any applicable laws</li>
                <li>Contains inappropriate or offensive material</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
              <p>
                In no event shall Remevi, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us through:
                <br />
                • Our feedback form on the website
                <br />
                • Opening an issue on our GitHub repository
                <br />
                • Sending an email to our support team
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 