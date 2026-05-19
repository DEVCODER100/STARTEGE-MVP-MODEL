export type TransactionType = "purchase" | "use" | "bonus" | "refund";

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  razorpayOrderId: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  razorpaySubscriptionId: string;
  campaignsUsedThisMonth: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}
