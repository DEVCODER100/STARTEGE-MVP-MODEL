export type Plan = "free" | "starter" | "pro";

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  plan: Plan;
  credits: number;
  aiMessagesToday: number;
  lastMessageReset: string;
  whatsappReminder: boolean;
  reminderTime: string;
  createdAt: string;
}
