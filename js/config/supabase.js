/**
 * js/config/supabase.js
 * ─────────────────────────────────────────────
 * Load SETELAH <script src="cdn supabase-js">
 * Hasilnya: variabel global `sb` tersedia di semua file JS lain
 * JANGAN pakai import/export — semua file pakai CDN global
 * ─────────────────────────────────────────────
 */

const SUPABASE_URL  = 'https://ihwpxhqflghiblbfjonx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod3B4aHFmbGdoaWJsYmZqb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI3MTYsImV4cCI6MjA5Mjg0ODcxNn0.bk_CewautLlPWewjZCXQMKNY8zPF1wkPVZu-VNxOzpc';

// Cukup satu export ini saja yang dipakai di semua file
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
