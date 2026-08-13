/**
 * Types for the `public` schema, mirroring supabase/migrations/0001_init.sql.
 *
 * Normally generated with `supabase gen types typescript`, which needs Docker.
 * Written by hand here to keep the prototype toolchain light — if you change a
 * migration, update this file to match.
 */

export type TeiTier = 'elemental' | 'basic' | 'premium';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          tier: TeiTier;
          accent_color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string;
          last_name?: string;
          email: string;
          tier?: TeiTier;
          accent_color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          tier?: TeiTier;
          accent_color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          performed_at: string;
          sets: number;
          rest_seconds: number;
          exertion_percent: number;
          cardio_minutes: number;
          tei: number;
          calculator: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          performed_at: string;
          sets: number;
          rest_seconds: number;
          exertion_percent: number;
          cardio_minutes: number;
          tei: number;
          calculator?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          performed_at?: string;
          sets?: number;
          rest_seconds?: number;
          exertion_percent?: number;
          cardio_minutes?: number;
          tei?: number;
          calculator?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      tei_tier: TeiTier;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type SessionRow = Database['public']['Tables']['sessions']['Row'];
export type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
