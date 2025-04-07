'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import type { Stripe } from "stripe";
import { useAuth } from "@clerk/nextjs";

type Status = Stripe.Subscription.Status;

export interface Subscription {
  subscriptionId: string;
  status: Status;
  priceId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  paymentMethod: {
    brand: string | null;
    last4: string | null;
  } | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { userId, isSignedIn } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/stripe/subscription?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch subscription');
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isSignedIn) {
      fetchSubscription();
    }
  }, [isSignedIn, fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading, refetch: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
} 