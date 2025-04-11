"use client";

import { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";
import { PricingModal } from "./PricingModal";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import type { STRIPE_SUB_CACHE } from "@/lib/stripe";

interface PricingButtonProps {
  subscription: STRIPE_SUB_CACHE | null;
}

export function PricingButton({ subscription }: PricingButtonProps) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle checkout success/error
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Successfully subscribed!");
    } else if (checkout === "cancelled") {
      toast.error("Subscription cancelled");
    }
  }, [searchParams]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-700"
      >
        <CreditCard className="h-6 w-6" />
      </button>

      <PricingModal 
        open={open} 
        onOpenChange={setOpen}
        subscription={subscription}
      />
    </>
  );
} 