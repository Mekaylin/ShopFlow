-- Create license_scans table for storing scanned license disk data
CREATE TABLE IF NOT EXISTS license_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_number TEXT NOT NULL,
  scan_data TEXT NOT NULL,
  scan_type TEXT,
  vehicle_type TEXT,
  province TEXT,
  expiry_date TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  business_id UUID REFERENCES businesses(id),
  scanned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE license_scans ENABLE ROW LEVEL SECURITY;

-- Create policy for businesses to see only their own license scans
CREATE POLICY "Businesses can view their own license scans" ON license_scans
  FOR SELECT USING (business_id = auth.uid() OR scanned_by = auth.uid());

-- Create policy for authenticated users to insert license scans
CREATE POLICY "Authenticated users can insert license scans" ON license_scans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_license_scans_business_id ON license_scans(business_id);
CREATE INDEX IF NOT EXISTS idx_license_scans_scanned_by ON license_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_license_scans_license_number ON license_scans(license_number);
CREATE INDEX IF NOT EXISTS idx_license_scans_scanned_at ON license_scans(scanned_at);
