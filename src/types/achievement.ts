export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  requirements: {
    type: string;
    value: number;
  };
  unlocked: boolean;
  progress: number;
  createdAt: string;
  updatedAt: string;
} 