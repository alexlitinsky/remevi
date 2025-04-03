"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"

const RemeviBrainLogo = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-colors duration-300"
  >
    {/* Main circle */}
    <circle
      cx="12"
      cy="12"
      r="8"
      stroke="currentColor"
      strokeWidth="1.5"
      className="animate-draw"
    />
    
    {/* Memory paths */}
    <path
      d="M8 12C8 9.79086 9.79086 8 12 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="animate-draw"
    />
    <path
      d="M12 16C14.2091 16 16 14.2091 16 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="animate-draw"
    />
    
    {/* Center dot */}
    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      className="animate-pulse opacity-80"
    />
  </svg>
);

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
        <RemeviBrainLogo />
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