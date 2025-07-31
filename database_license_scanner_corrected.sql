-- CORRECTED License Scanner SQL for Supabase
-- This version properly handles the relationship between auth.users and public.users

-- Create vehicle_scans table
CREATE TABLE IF NOT EXISTS public.vehicle_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vehicle information from license disk
    license_number VARCHAR(20) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year VARCHAR(4) NOT NULL,
    vin VARCHAR(50) NOT NULL,
    owner_name VARCHAR(200) NOT NULL,
    owner_id_number VARCHAR(20) NOT NULL,
    
    -- Scan metadata
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_quality VARCHAR(20) DEFAULT 'good' CHECK (scan_quality IN ('good', 'fair', 'poor')),
    notes TEXT,
    
    -- Verification status
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_scans_business_id ON public.vehicle_scans(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_scans_scanned_by ON public.vehicle_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_scans_license_number ON public.vehicle_scans(license_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_scans_scanned_at ON public.vehicle_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_scans_business_date ON public.vehicle_scans(business_id, scanned_at DESC);

-- Enable Row Level Security
ALTER TABLE public.vehicle_scans ENABLE ROW LEVEL SECURITY;

-- CORRECTED RLS POLICIES - Using auth.uid() which returns the auth.users.id
-- RLS Policy: Users can view scans from their business
CREATE POLICY "Users can view vehicle scans from their business" ON public.vehicle_scans
    FOR SELECT
    USING (
        business_id IN (
            SELECT u.business_id 
            FROM public.users u 
            WHERE u.id = auth.uid()
        )
    );

-- RLS Policy: Users can insert scans for their business  
CREATE POLICY "Users can insert vehicle scans for their business" ON public.vehicle_scans
    FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT u.business_id 
            FROM public.users u 
            WHERE u.id = auth.uid()
        )
        AND scanned_by = auth.uid()
    );

-- RLS Policy: Users can update their own scans or admins can update any
CREATE POLICY "Users can update their own scans or admins can update any" ON public.vehicle_scans
    FOR UPDATE
    USING (
        scanned_by = auth.uid() 
        OR (
            business_id IN (
                SELECT u.business_id 
                FROM public.users u 
                WHERE u.id = auth.uid() AND u.role = 'admin'
            )
        )
    );

-- RLS Policy: Only admins can delete scans
CREATE POLICY "Only admins can delete vehicle scans" ON public.vehicle_scans
    FOR DELETE
    USING (
        business_id IN (
            SELECT u.business_id 
            FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_scans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_vehicle_scans_updated_at ON public.vehicle_scans;
CREATE TRIGGER trigger_vehicle_scans_updated_at
    BEFORE UPDATE ON public.vehicle_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_scans_updated_at();

-- CORRECTED VIEW - Properly joining with public.users table
CREATE OR REPLACE VIEW public.vehicle_scans_with_user_info AS
SELECT 
    vs.*,
    u.email as scanned_by_email,
    vu.email as verified_by_email,
    b.name as business_name
FROM public.vehicle_scans vs
LEFT JOIN public.users u ON vs.scanned_by = u.id
LEFT JOIN public.users vu ON vs.verified_by = vu.id
LEFT JOIN public.businesses b ON vs.business_id = b.id;

-- Function to get scan statistics (matches TypeScript interface)
CREATE OR REPLACE FUNCTION get_scan_statistics(business_uuid UUID)
RETURNS TABLE(
    total_scans BIGINT,
    scans_today BIGINT,
    scans_this_week BIGINT,
    scans_this_month BIGINT,
    unique_scanners BIGINT,
    unique_vehicles BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE DATE(scanned_at) = CURRENT_DATE) as scans_today,
        COUNT(*) FILTER (WHERE scanned_at >= DATE_TRUNC('week', CURRENT_DATE)) as scans_this_week,
        COUNT(*) FILTER (WHERE scanned_at >= DATE_TRUNC('month', CURRENT_DATE)) as scans_this_month,
        COUNT(DISTINCT scanned_by) as unique_scanners,
        COUNT(DISTINCT license_number) as unique_vehicles
    FROM public.vehicle_scans 
    WHERE business_id = business_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CORRECTED duplicate check function - Properly joining with public.users
CREATE OR REPLACE FUNCTION check_duplicate_license(
    license_num VARCHAR(20), 
    business_uuid UUID,
    exclude_scan_id UUID DEFAULT NULL
)
RETURNS TABLE(
    scan_id UUID,
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.id,
        vs.scanned_at,
        u.email
    FROM public.vehicle_scans vs
    JOIN public.users u ON vs.scanned_by = u.id
    WHERE vs.license_number = license_num 
      AND vs.business_id = business_uuid
      AND (exclude_scan_id IS NULL OR vs.id != exclude_scan_id)
    ORDER BY vs.scanned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_scans TO authenticated;
GRANT SELECT ON public.vehicle_scans_with_user_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_license(VARCHAR(20), UUID, UUID) TO authenticated;
