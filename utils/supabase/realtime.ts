import { createClient } from './client';
import type { Database } from '@/types/supabase';

export const supabaseClient = createClient();

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type ChatRoom = Database['public']['Tables']['chat_rooms']['Row']; 