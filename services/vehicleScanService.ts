// services/vehicleScanService.ts
// Service for managing vehicle license disk scans with Supabase

import { supabase } from '../lib/supabase';
import type { VehicleScan, VehicleScanWithUserInfo, ScanStatistics } from '../components/utility/types';

export interface CreateVehicleScanData {
  license_number: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  owner_name: string;
  owner_id_number: string;
  scan_quality?: 'good' | 'fair' | 'poor';
  notes?: string;
}

export interface VehicleScanFilters {
  license_number?: string;
  make?: string;
  scanned_by?: string;
  date_from?: string;
  date_to?: string;
  verified?: boolean;
}

class VehicleScanService {
  
  /**
   * Create a new vehicle scan record
   */
  async createScan(scanData: CreateVehicleScanData, businessId: string): Promise<VehicleScan> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('vehicle_scans')
        .insert({
          business_id: businessId,
          scanned_by: user.user.id,
          ...scanData,
          scan_quality: scanData.scan_quality || 'good'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating vehicle scan:', error);
        throw new Error(`Failed to create vehicle scan: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createScan:', error);
      throw error;
    }
  }

  /**
   * Get all vehicle scans for a business with optional filters
   */
  async getScans(
    businessId: string, 
    filters?: VehicleScanFilters,
    limit?: number,
    offset?: number
  ): Promise<VehicleScanWithUserInfo[]> {
    try {
      let query = supabase
        .from('vehicle_scans_with_user_info')
        .select('*')
        .eq('business_id', businessId)
        .order('scanned_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.license_number) {
          query = query.ilike('license_number', `%${filters.license_number}%`);
        }
        if (filters.make) {
          query = query.ilike('make', `%${filters.make}%`);
        }
        if (filters.scanned_by) {
          query = query.eq('scanned_by', filters.scanned_by);
        }
        if (filters.date_from) {
          query = query.gte('scanned_at', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('scanned_at', filters.date_to);
        }
        if (filters.verified !== undefined) {
          query = query.eq('verified', filters.verified);
        }
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicle scans:', error);
        throw new Error(`Failed to fetch vehicle scans: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getScans:', error);
      throw error;
    }
  }

  /**
   * Get scan statistics for a business
   */
  async getScanStatistics(businessId: string): Promise<ScanStatistics> {
    try {
      const { data, error } = await supabase
        .rpc('get_scan_statistics', { business_uuid: businessId });

      if (error) {
        console.error('Error fetching scan statistics:', error);
        throw new Error(`Failed to fetch scan statistics: ${error.message}`);
      }

      return data[0] || {
        total_scans: 0,
        scans_today: 0,
        scans_this_week: 0,
        scans_this_month: 0,
        unique_scanners: 0,
        unique_vehicles: 0
      };
    } catch (error) {
      console.error('Error in getScanStatistics:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate license scans
   */
  async checkDuplicateLicense(
    licenseNumber: string, 
    businessId: string, 
    excludeScanId?: string
  ): Promise<{ scan_id: string; scanned_at: string; scanned_by_email: string }[]> {
    try {
      const { data, error } = await supabase
        .rpc('check_duplicate_license', {
          license_num: licenseNumber,
          business_uuid: businessId,
          exclude_scan_id: excludeScanId || null
        });

      if (error) {
        console.error('Error checking duplicate license:', error);
        throw new Error(`Failed to check duplicate license: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in checkDuplicateLicense:', error);
      throw error;
    }
  }

  /**
   * Update a vehicle scan
   */
  async updateScan(scanId: string, updates: Partial<CreateVehicleScanData>): Promise<VehicleScan> {
    try {
      const { data, error } = await supabase
        .from('vehicle_scans')
        .update(updates)
        .eq('id', scanId)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle scan:', error);
        throw new Error(`Failed to update vehicle scan: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateScan:', error);
      throw error;
    }
  }

  /**
   * Verify a vehicle scan (admin only)
   */
  async verifyScan(scanId: string): Promise<VehicleScan> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('vehicle_scans')
        .update({
          verified: true,
          verified_by: user.user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', scanId)
        .select()
        .single();

      if (error) {
        console.error('Error verifying vehicle scan:', error);
        throw new Error(`Failed to verify vehicle scan: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in verifyScan:', error);
      throw error;
    }
  }

  /**
   * Delete a vehicle scan (admin only)
   */
  async deleteScan(scanId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicle_scans')
        .delete()
        .eq('id', scanId);

      if (error) {
        console.error('Error deleting vehicle scan:', error);
        throw new Error(`Failed to delete vehicle scan: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteScan:', error);
      throw error;
    }
  }

  /**
   * Get a single vehicle scan by ID
   */
  async getScanById(scanId: string): Promise<VehicleScanWithUserInfo | null> {
    try {
      const { data, error } = await supabase
        .from('vehicle_scans_with_user_info')
        .select('*')
        .eq('id', scanId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        console.error('Error fetching vehicle scan:', error);
        throw new Error(`Failed to fetch vehicle scan: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getScanById:', error);
      throw error;
    }
  }

  /**
   * Export scans to CSV format
   */
  async exportScansToCSV(businessId: string, filters?: VehicleScanFilters): Promise<string> {
    try {
      const scans = await this.getScans(businessId, filters);
      
      const headers = [
        'License Number',
        'Make',
        'Model', 
        'Year',
        'VIN',
        'Owner Name',
        'Owner ID',
        'Scanned At',
        'Scanned By',
        'Verified',
        'Quality',
        'Notes'
      ];

      const csvContent = [
        headers.join(','),
        ...scans.map(scan => [
          scan.license_number,
          scan.make,
          scan.model,
          scan.year,
          scan.vin,
          scan.owner_name,
          scan.owner_id_number,
          new Date(scan.scanned_at).toLocaleString(),
          scan.scanned_by_email,
          scan.verified ? 'Yes' : 'No',
          scan.scan_quality,
          scan.notes || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error in exportScansToCSV:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const vehicleScanService = new VehicleScanService();
export default vehicleScanService;
