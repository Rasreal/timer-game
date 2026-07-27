// Mirrors lib/backend/supabase/database/tables/cities.dart
export interface City {
  id: number
  name: string
  region?: string | null
  latitude?: number | null
  longitude?: number | null
  first_letter?: string | null
}
