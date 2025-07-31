#!/bin/bash
# setup_license_scanner.sh
# Script to set up the license scanner database schema

echo "🚀 Setting up License Scanner Database Schema..."

# Check if .env.local exists for database connection
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials:"
    echo "EXPO_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
    exit 1
fi

# Load environment variables
source .env.local

echo "📊 Running database schema creation..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "Please install PostgreSQL client tools or run the SQL manually in Supabase Dashboard"
    echo "SQL file location: ./database_license_scanner.sql"
    exit 1
fi

# Extract connection details from Supabase URL
if [[ $EXPO_PUBLIC_SUPABASE_URL =~ https://([^.]+)\.supabase\.co ]]; then
    PROJECT_ID="${BASH_REMATCH[1]}"
    echo "📡 Connecting to Supabase project: $PROJECT_ID"
else
    echo "❌ Error: Invalid Supabase URL format"
    exit 1
fi

# Note: You'll need the direct database password for this
echo "⚠️  Note: You'll need your Supabase database password (not the anon key)"
echo "📝 If you don't have psql access, please run the SQL manually:"
echo "   1. Go to your Supabase Dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Copy and paste the contents of database_license_scanner.sql"
echo "   4. Execute the SQL"

# Alternatively, suggest using Supabase CLI
echo ""
echo "🔧 Alternative: Use Supabase CLI"
echo "   1. Install Supabase CLI: npm install -g supabase"
echo "   2. Login: supabase login"
echo "   3. Link project: supabase link --project-ref $PROJECT_ID"
echo "   4. Run migration: supabase db push"

echo ""
echo "✅ Setup instructions provided!"
echo "📄 Database schema file: ./database_license_scanner.sql"
