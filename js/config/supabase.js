import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ihwpxhqflghiblbfjonx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)