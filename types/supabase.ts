export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          chat_room_id: string;
          user_id: string | null;
          role: 'user' | 'assistant';
          content: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          chat_room_id: string;
          user_id?: string | null;
          role: 'user' | 'assistant';
          content: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          chat_room_id?: string;
          user_id?: string | null;
          role?: 'user' | 'assistant';
          content?: string;
        };
      };
      chat_rooms: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          user_id?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 