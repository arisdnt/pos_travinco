import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client untuk browser
export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Export default untuk backward compatibility
export default createClient