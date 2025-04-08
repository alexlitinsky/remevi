'use client';

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeedbackButton() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => {
          window.location.href = 'mailto:hello@remevi.com?subject=Remevi%20Feedback';
        }}
        className="rounded-full shadow-lg flex items-center gap-2 bg-primary/90 hover:bg-primary"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </Button>
    </div>
  );
} 