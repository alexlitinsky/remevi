"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"

export function Header() {
  const pathname = usePathname()
  const showHeader = !pathname?.includes('/deck/configure') && !pathname?.includes('/session') && !pathname?.includes('/quiz')

  if (!showHeader) return null

  return (
    <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 gap-4 h-16 bg-[#0B1120]/80 backdrop-blur-md border-b border-border/40 z-50">
      <Link 
        href="/" 
        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
      >
        <Image
          src="/remevi-brain-logo.svg"
          alt="Remevi Brain Logo"
          width={24}
          height={24}
          className="transition-colors duration-300"
        />
        <span className="font-semibold">Remevi</span>
      </Link>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton 
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8",
                userButtonTrigger: "hover:bg-muted rounded-full p-1"
              }
            }}
          />
        </SignedIn>
      </div>
    </header>
  )
} 