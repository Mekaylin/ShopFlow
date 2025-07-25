import { supabase } from '../../lib/supabase';
import { MaterialType } from './types';

export async function fetchMaterialTypes(business_id: string): Promise<MaterialType[]> {
  const { data, error } = await supabase
    .from('material_types')
    .select('*')
    .eq('business_id', business_id);
  if (error) throw error;
  return data || [];
}
