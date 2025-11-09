/**
 * Database Migration Runner
 * 
 * This script runs the database migration to change payment method from "bank" to "kplus"
 * 
 * Run with: node scripts/run-migration.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting database migration: bank → kplus\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_change_bank_to_kplus.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n---\n');

    // Note: The Supabase JS client doesn't support running raw SQL directly
    // You need to run this through the Supabase Dashboard SQL Editor or CLI
    
    console.log('⚠️  IMPORTANT: This migration must be run through Supabase Dashboard or CLI\n');
    console.log('Option 1: Supabase Dashboard (Recommended)');
    console.log('  1. Go to: https://supabase.com/dashboard/project/sjgqhykhtxfiivizhgti/sql');
    console.log('  2. Copy the SQL from: supabase/migrations/002_change_bank_to_kplus.sql');
    console.log('  3. Paste and click "Run"\n');
    
    console.log('Option 2: Supabase CLI');
    console.log('  1. Install CLI: npm install -g supabase');
    console.log('  2. Login: supabase login');
    console.log('  3. Link project: supabase link --project-ref sjgqhykhtxfiivizhgti');
    console.log('  4. Run migration: supabase db push\n');

    console.log('Option 3: Manual SQL Execution');
    console.log('  Run this SQL in the Supabase SQL Editor:\n');
    console.log('  ' + migrationSQL.split('\n').join('\n  '));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
