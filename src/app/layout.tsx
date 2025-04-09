import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Header } from "@/components/layout/header";
import { PricingButton } from "@/components/pricing/PricingButton";
import { getUserSubscriptionStatus } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { Toaster } from "sonner";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { FeedbackButton } from "@/components/layout/FeedbackButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Remevi - AI-Powered Learning Platform | Master Any Subject 10x Faster",
  description: "Transform your learning with Remevi's AI-powered platform. Create personalized flashcards, take smart quizzes, and master any subject 10x faster. Join thousands of students accelerating their education.",
  keywords: "AI learning, flashcards, quiz platform, study tools, education technology, personalized learning, spaced repetition, study smarter",
  openGraph: {
    title: "Remevi - AI-Powered Learning Platform",
    description: "Master any subject 10x faster with AI-powered flashcards and quizzes",
    type: "website",
    locale: "en_US",
    siteName: "Remevi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Remevi - AI-Powered Learning Platform",
    description: "Master any subject 10x faster with AI-powered flashcards and quizzes",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  const subscription = user ? await getUserSubscriptionStatus(user.id) : null;

  return (
    <ClerkProvider appearance={{
      baseTheme: dark,
      elements: {
        card: "bg-background",
        headerTitle: "text-foreground",
        headerSubtitle: "text-muted-foreground"
      }
    }}>
      <html lang="en" className="h-full dark">
        <head>
          <meta name="darkreader-lock" />
        </head>
        <body className={`${inter.className} h-full bg-[#0B1120] text-foreground`}>
          <SubscriptionProvider>
            <UploadProvider>
              <Header />
              {children}
              <FeedbackButton />
              {user && <PricingButton subscription={subscription} />}
              <Toaster />
            </UploadProvider>
          </SubscriptionProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
