export interface Campaign {
  id: string;
  user_id: string;
  caption: string;
  hashtags: string;
  hook: string;
  idea: string;
  platform: string;
  post_type: string;
  best_time: string;
  why_this_works: string;
  whatsapp_status: string;
  whatsapp_broadcast: string;
  image_urls: string[];
  recommended_image_index: number;
  posted: boolean;
  feedback: string | null;
  credits_used: number | null;
  created_at: string;
}
