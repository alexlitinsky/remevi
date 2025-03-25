"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"

export function Header() {
  const pathname = usePathname()
  const showHeader = !pathname?.includes('/deck/configure') && !pathname?.includes('/session')

  if (!showHeader) return null

  return (
    <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 gap-4 h-16 bg-[#0B1120]/80 backdrop-blur-md border-b border-border/40 z-50">
      <Link 
        href="/" 
        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span className="font-semibold">Remevi</span>
      </Link>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
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