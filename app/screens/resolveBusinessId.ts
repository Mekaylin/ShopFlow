import { supabase } from '../../lib/supabase';

/**
 * Resolves a business code to a business ID from the businesses table.
 * @param code The business code to look up.
 * @returns The business ID if found, otherwise null.
 */
export async function resolveBusinessId(code: string): Promise<string | null> {
  if (!code) return null;
  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('code', code)
    .single();
  if (error || !data) {
    console.error('resolveBusinessId error:', error);
    return null;
  }
  return data.id;
}
