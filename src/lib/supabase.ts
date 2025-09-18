import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Legacy client for backward compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// SSR-compatible browser client for AuthContext
export const createSupabaseBrowser = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server-side admin client - only use in API routes or server components
export const createSupabaseAdmin = () => {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          is_active: boolean
          subscription_expires_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          is_active?: boolean
          subscription_expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          is_active?: boolean
          subscription_expires_at?: string | null
          created_at?: string
        }
      }
      price_lists: {
        Row: {
          id: string
          uploaded_by: string | null
          file_name: string
          supplier_name: string | null
          storage_path: string
          openai_file_id: string | null
          openai_vector_file_id: string | null
          is_active: boolean
          uploaded_at: string
        }
        Insert: {
          id?: string
          uploaded_by?: string | null
          file_name: string
          supplier_name?: string | null
          storage_path: string
          openai_file_id?: string | null
          openai_vector_file_id?: string | null
          is_active?: boolean
          uploaded_at?: string
        }
        Update: {
          id?: string
          uploaded_by?: string | null
          file_name?: string
          supplier_name?: string | null
          storage_path?: string
          openai_file_id?: string | null
          openai_vector_file_id?: string | null
          is_active?: boolean
          uploaded_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string | null
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string | null
          user_id: string | null
          content: string
          role: string
          tokens_used: number
          response_time_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          user_id?: string | null
          content: string
          role: string
          tokens_used?: number
          response_time_ms?: number
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          user_id?: string | null
          content?: string
          role?: string
          tokens_used?: number
          response_time_ms?: number
          created_at?: string
        }
      }
    }
  }
}