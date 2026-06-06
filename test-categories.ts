import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const rawSupabaseUrl = process.env.SUPABASE_URL || "";
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

async function run() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("Missing config");
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('categories').select('*').limit(1);
  if (error) {
    console.log("Categories table error:", error.message);
  } else {
    console.log("Categories table exists. Sample data:", data);
  }
}

run();
