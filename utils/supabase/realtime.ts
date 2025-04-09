import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type ChatRoom = Database['public']['Tables']['chat_rooms']['Row']; 