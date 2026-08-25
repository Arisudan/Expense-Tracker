/**
 * Supabase Client Initialization
 * 
 * Uses the UMD build loaded via CDN in index.html.
 * Falls back to localStorage if Supabase connection fails.
 */

const SUPABASE_URL = 'https://krzumgjmpupszowfhkps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyenVtZ2ptcHVwc3pvd2Zoa3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjcxMTgsImV4cCI6MjEwMzI0MzExOH0.h_yKXvYP_j3POiElyn2pWlNuNO9SqeHFbwOShzN4V3M';

let supabaseClient = null;
let useLocalStorage = false;

try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.warn('Supabase client initialization failed, using localStorage fallback:', err);
  useLocalStorage = true;
}

/**
 * Authentication Helpers
 */

async function signInWithEmail(email, password) {
  if (!supabaseClient) return { error: new Error('Supabase not initialized') };
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function signOut() {
  if (!supabaseClient) return { error: null };
  return await supabaseClient.auth.signOut();
}

async function getSession() {
  if (!supabaseClient) return { data: { session: null }, error: null };
  return await supabaseClient.auth.getSession();
}

function onAuthStateChange(callback) {
  if (!supabaseClient) return { data: { subscription: null } };
  return supabaseClient.auth.onAuthStateChange(callback);
}

// Export auth functions globally if we're not using ES modules properly in browser,
// or just attach to window for now since it's a simple setup.
window.supabaseAuth = {
  signInWithEmail,
  signOut,
  getSession,
  onAuthStateChange
};
