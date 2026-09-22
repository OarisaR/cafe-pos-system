import { createClient } from '@supabase/supabase-js'

// ⚠️ createClient এর *আগে* পড়তে হয়। নিচে detectSessionInUrl চালু আছে,
// তাই Supabase URL এর hash টা পড়ামাত্রই মুছে দেয় — অথচ ইমেইল confirm
// এর পেজটার ওই তথ্যটা (type=signup, error ইত্যাদি) দরকার।
export const INITIAL_URL_HASH =
  typeof window !== 'undefined' ? window.location.hash : ''

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
