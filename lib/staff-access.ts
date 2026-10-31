export type StaffAccount = {
  user_id: string;
  email: string;
  full_name: string;
  is_administrator: boolean;
  is_owner: boolean;
};

export type StaffAccessEvent = {
  id: number;
  actor_id: string | null;
  target_id: string;
  action: string;
  created_at: string;
};
