export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  email_verified: boolean;
  earning_balance: number;
  deposit_balance: number;
  status: 'active' | 'suspended' | 'blocked' | 'admin';
  is_verified: boolean;
  is_premium: boolean;
  premium_expires_at: string | null;
  referral_code: string | null;
  referred_by: string | null;
  total_earned: number;
  total_deposit: number;
  total_withdraw: number;
  tasks_completed: number;
  jobs_posted: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  url: string;
  proof_instructions: string;
  screenshot_count: number;
  screenshot_instructions: string;
  image_url: string;
  reward_per_worker: number;
  total_slots: number;
  filled_slots: number;
  status: 'active' | 'paused' | 'completed' | 'rejected';
  is_premium_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  job_id: string;
  worker_id: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  proof_url: string;
  proof_text: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  tip_amount?: number;
  admin_note?: string | null;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  sender_number: string;
  transaction_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  account_number: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'referral_bonus' | 'premium_charge' | 'ad_charge';
  amount: number;
  balance_type: 'earning' | 'deposit';
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

export interface Advertisement {
  id: string;
  user_id: string;
  title: string;
  url: string;
  image_url: string;
  clicks: number;
  impressions: number;
  budget: number;
  spent: number;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  created_at: string;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
  is_boolean: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_amount: number;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ---- Live Chat ----
export interface ChatConversation {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  user_unread_count: number;
  admin_unread_count: number;
  last_message_at: string;
  last_message: string;
  last_sender_is_admin: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_admin_reply: boolean;
  read_at: string | null;
  created_at: string;
}
