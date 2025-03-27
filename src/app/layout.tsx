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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Study Assistant",
  description: "Generate flashcards and mind maps from your study materials",
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
            <Header />
            {children}
            {user && <PricingButton subscription={subscription} />}
            <Toaster />
          </SubscriptionProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
