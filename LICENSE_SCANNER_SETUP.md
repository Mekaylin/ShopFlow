# License Scanner Database Setup Instructions

## 🚀 Quick Setup

### Option 1: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy the entire contents of `database_license_scanner.sql`
5. Paste and run the SQL

### Option 2: Supabase CLI
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (replace PROJECT_ID with your actual project ID)
supabase link --project-ref YOUR_PROJECT_ID

# Run the SQL file
supabase db push database_license_scanner.sql
```

### Option 3: Direct Database Connection
```bash
# Make the setup script executable
chmod +x setup_license_scanner.sh

# Run the setup script
./setup_license_scanner.sh
```

## 📋 What Gets Created

### Tables
- **`vehicle_scans`** - Main table for storing scanned license disk data
- **`vehicle_scans_with_user_info`** - View with joined user information

### Functions
- **`get_scan_statistics()`** - Returns scan statistics for a business
- **`check_duplicate_license()`** - Checks for duplicate license scans
- **`update_vehicle_scans_updated_at()`** - Auto-updates timestamp

### Security
- **Row Level Security (RLS)** enabled with policies for:
  - Users can only see scans from their business
  - Users can insert scans for their business
  - Users can update their own scans, admins can update any
  - Only admins can delete scans

### Indexes
- Performance indexes on business_id, license_number, VIN, and scan dates

## 🔒 Permissions

The schema automatically grants appropriate permissions to authenticated users and ensures data security through RLS policies.

## 📊 Features Included

- ✅ Vehicle license disk scanning and storage
- ✅ Duplicate detection
- ✅ Scan verification system
- ✅ Statistics and analytics
- ✅ Business-level data isolation
- ✅ Audit trail with timestamps
- ✅ Data export functionality

## 🧪 Testing

After running the schema, you can test with sample data by uncommenting the INSERT statement at the bottom of `database_license_scanner.sql` and updating it with your actual business and user IDs.

## 🔧 Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure you're logged in as the project owner
2. **Table Already Exists**: The script uses `IF NOT EXISTS` so it's safe to run multiple times
3. **Function Errors**: Make sure you have the latest PostgreSQL extensions enabled

### Getting Help
- Check the Supabase Dashboard logs
- Verify your project permissions
- Ensure all required tables (users, businesses) exist from your existing schema

---

🎉 Once complete, your license scanner will be fully integrated with Supabase cloud storage!
