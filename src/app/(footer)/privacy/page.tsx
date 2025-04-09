import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <Card>
          <CardContent className="prose prose-invert max-w-none p-6">
            <p className="text-lg mb-6">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
              <p>We collect and process the following data:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Account information (email, name)</li>
                <li>Usage data (study patterns, performance)</li>
                <li>Content you upload (documents, notes)</li>
                <li>Technical data (IP address, browser type)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
              <p>We use your data to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Provide and improve our services</li>
                <li>Generate personalized study materials</li>
                <li>Track your learning progress</li>
                <li>Send important updates about our service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Your data is encrypted in transit and at rest.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Request transfer of your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us through:
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