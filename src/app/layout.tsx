import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Study Assistant",
  description: "Generate flashcards and mind maps from your study materials",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
