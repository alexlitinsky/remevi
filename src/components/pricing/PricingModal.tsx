"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STRIPE_SUB_CACHE } from "@/lib/stripe";
import { cn } from "@/lib/utils";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: STRIPE_SUB_CACHE | null;
}

const MONTHLY_PRICE = 8.00;
const ANNUAL_PRICE = 4.00;
const ANNUAL_TOTAL = ANNUAL_PRICE * 12;
const FEATURES = [
  "Unlimited Generations",
  "Unlimited Pages per Document",
  "Advanced AI Models",
  "Higher Question Ranges",
];
const FREE_FEATURES = [
  "Up to 10 Generations",
  "Up to 30 Pages per Document",
  "Standard AI Models",
  "Lower Question Ranges",
];

export function PricingModal({ open, onOpenChange, subscription }: PricingModalProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      const priceId = isAnnual ? 
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL :
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;

      // Get current URL without any query params
      const currentUrl = window.location.href.split('?')[0];
      
      const response = await fetch(`/api/stripe/create-checkout?priceId=${priceId}&returnUrl=${encodeURIComponent(currentUrl)}`);
      const data = await response.json();

      if (!response.ok) throw new Error("Failed to create checkout session");

      // Close modal before redirect
      onOpenChange(false);
      window.location.href = data.url;
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      // Get current URL without any query params
      const currentUrl = window.location.href.split('?')[0];
      
      const response = await fetch(`/api/stripe/portal?returnUrl=${encodeURIComponent(currentUrl)}`);
      const data = await response.json();

      if (!response.ok) throw new Error("Failed to access billing portal");

      // Close modal before redirect
      onOpenChange(false);
      window.location.href = data.url;
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Portal error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubscribed = subscription && subscription.status !== "none" && ["active", "trialing"].includes(subscription.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 m-auto h-fit max-h-[90vh] w-[1000px] max-w-[90vw] overflow-y-auto p-0 bg-black">
        <div className="px-6 pt-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-center text-2xl font-bold tracking-tight">
              {isSubscribed ? "Manage Your Plan" : "Choose Your Plan"}
            </DialogTitle>
          </DialogHeader>
          
          {!isSubscribed && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className={cn("text-sm font-medium transition-colors duration-200", 
                !isAnnual ? "text-blue-500" : "text-zinc-400"
              )}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className={cn("text-sm font-medium transition-colors duration-200", 
                isAnnual ? "text-blue-500" : "text-zinc-400"
              )}>
                Annual
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 px-4 pb-6">
          {/* Free Plan */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-zinc-100">Free</div>
              <div className="mt-1 text-sm text-zinc-400">forever</div>
            </div>

            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="rounded-full bg-zinc-600 p-1">
                    <Check className="h-3.5 w-3.5 text-zinc-300" />
                  </div>
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6 w-full bg-zinc-700 text-white hover:bg-zinc-600"
              onClick={() => onOpenChange(false)}
            >
              Continue with Free Plan
            </Button>
          </div>

          {/* Paid Plan */}
          <div className="rounded-lg border border-blue-900/50 bg-blue-900/10 p-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-zinc-100">
                ${isAnnual ? ANNUAL_PRICE : MONTHLY_PRICE}
              </div>
              <div className="mt-1 text-sm text-zinc-400">per month</div>
              {isAnnual && (
                <>
                  <div className="mt-2 text-sm text-zinc-400">
                    ${ANNUAL_TOTAL.toFixed(2)} billed annually
                  </div>
                  <div className="mt-2 text-sm font-medium text-emerald-500">
                    Save ${((MONTHLY_PRICE - ANNUAL_PRICE) * 12).toFixed(2)} per year
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-blue-700 to-transparent" />

            <ul className="mt-6 space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-500/10 p-1">
                    <Check className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span className="text-sm text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              onClick={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Subscribe ${isAnnual ? "Annually" : "Monthly"}`
              )}
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment powered by Stripe
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}