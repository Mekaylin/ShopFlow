
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { SearchAndFilterBar } from '../ui/SearchAndFilterBar';
import { adminStyles } from '../utility/styles';
import AdminModal from './AdminModal';

import type { Material, MaterialType, User } from '../utility/types';
interface MaterialsTabProps {
  user: User;
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  materialTypes: Record<string, MaterialType[]>;
  setMaterialTypes: (types: Record<string, MaterialType[]>) => void;
  darkMode: boolean;
}


const MaterialsTab: React.FC<MaterialsTabProps> = ({
  user,
  materials,
  setMaterials,
  materialTypes,
  setMaterialTypes,
  darkMode,
}) => {
  const themeColors = darkMode ? Colors.dark : Colors.light;
  // Fetch all material types for the business and group by material_id
  useEffect(() => {
    if (!user?.business_id) return;
    const fetchAllTypes = async () => {
      const { data: types, error } = await supabase
        .from('material_types')
        .select('*')
        .eq('business_id', user.business_id);
      if (!error && types) {
        // Group by material_id
        const grouped: Record<string, MaterialType[]> = {};
        types.forEach((type: MaterialType) => {
          if (!grouped[type.material_id]) grouped[type.material_id] = [];
          grouped[type.material_id].push(type);
        });
        setMaterialTypes(grouped);
      }
    };
    fetchAllTypes();
  }, [user?.business_id, materials.length]);
  // --- Material state ---
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');
  const [newMaterialTypeLabel, setNewMaterialTypeLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [addTypeModal, setAddTypeModal] = useState<string | null>(null);

  // Helper function to refetch materials and handle errors
  const refetchMaterials = async () => {
    try {
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
      return true;
    } catch (fetchErr) {
      console.error('Refetch materials error:', fetchErr);
      Alert.alert('Error', 'Failed to refresh materials list.');
      return false;
    }
  };

  // Helper function for consistent error handling
  const handleMaterialError = (operation: string, error: any) => {
    const message = error?.message || String(error);
    Alert.alert('Error', `Failed to ${operation}: ${message}`);
    console.error(`MaterialsTab ${operation} error:`, error);
  };

  // Material CRUD handlers
  const handleAddMaterial = async () => {
    console.log('handleAddMaterial called');
    console.log('Current user:', user);
    if (!user || !user.business_id || !user.id) {
      Alert.alert('Auth Error', 'User session missing. Please log in again.');
      return;
    }
    if (!newMaterialName || !newMaterialUnit) {
      Alert.alert('Missing Fields', 'Please enter both name and unit.');
      return;
    }
    const payload = {
      name: newMaterialName,
      unit: newMaterialUnit,
      business_id: user.business_id,
    };
    console.log('Payload:', payload);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('materials')
        .insert(payload)
        .select('*');
      if (error) {
        handleMaterialError('add material', error);
        return;
      }
      
      await refetchMaterials();
      setNewMaterialName('');
      setNewMaterialUnit('');
    } catch (err: any) {
      handleMaterialError('add material', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMaterial = async () => {
    if (!editMaterial) return;
    if (!newMaterialName || !newMaterialUnit) {
      Alert.alert('Missing Fields', 'Please enter both name and unit.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('materials')
        .update({
          name: newMaterialName,
          unit: newMaterialUnit,
        })
        .eq('id', editMaterial.id)
        .select('*');
      if (error) {
        handleMaterialError('update material', error);
        return;
      }
      
      await refetchMaterials();
      setEditMaterial(null);
      setNewMaterialName('');
      setNewMaterialUnit('');
    } catch (err: any) {
      handleMaterialError('update material', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    setLoading(true);
    try {
      const result = await Promise.race([
        supabase
          .from('materials')
          .delete()
          .eq('id', id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 8000)),
      ]);
      const { error } = result as any;
      if (error) {
        handleMaterialError('delete material', error);
      } else {
        await refetchMaterials();
      }
    } catch (err) {
      handleMaterialError('delete material', err);
    } finally {
      setLoading(false);
    }
  };

  // Add Material Type logic (persist to Supabase)
  const handleAddMaterialType = async (materialId: string) => {
    if (!newMaterialTypeLabel) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('material_types')
        .insert({
          name: newMaterialTypeLabel,
          material_id: materialId,
          business_id: user.business_id,
        });
      if (error) {
        const errMsg = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
        alert('Failed to add type: ' + errMsg);
        return;
      }
      // Refetch types for this material
      const { data: types, error: fetchError } = await supabase
        .from('material_types')
        .select('*')
        .eq('material_id', materialId)
        .eq('business_id', user.business_id);
      if (!fetchError && types) {
        setMaterialTypes({ ...materialTypes, [materialId]: types });
      }
      setNewMaterialTypeLabel('');
      setAddTypeModal(null); // Close modal after successful add
    } catch (err) {
      const errMsg = typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err);
      alert('Unexpected error: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Filter materials by search and type
  const filteredMaterials = materials.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) &&
    (!typeFilter || (materialTypes[item.id]?.some(type => type.name === typeFilter)))
  );

  return (
    <View style={darkMode ? adminStyles.darkContainer : adminStyles.container}>
      <Text style={[adminStyles.sectionTitle, { marginBottom: 8 }]}>Materials</Text>
      <View style={{ paddingHorizontal: 8, marginBottom: 4 }}>
        <SearchAndFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          filterChips={[{ label: 'All', value: '' }, ...Object.values(materialTypes).flat().map(type => ({ label: type.name, value: type.name }))]}
          selectedFilter={typeFilter}
          onFilterChange={setTypeFilter}
          placeholder="Search materials by name..."
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 2 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredMaterials.map(item => (
          <View key={item.id} style={[
            darkMode ? adminStyles.darkCard : adminStyles.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 10,
              padding: 8,
              marginBottom: 8,
              marginHorizontal: 1,
              minWidth: 0,
              maxWidth: '100%',
            },
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={[adminStyles.subtitle, darkMode && adminStyles.darkSubtitle, { fontSize: 14 }]}>
                {item.name} <Text style={adminStyles.textSecondary}>({item.unit})</Text>
              </Text>
              {/* Only show the name, not 'Material Name' */}
              {materialTypes[item.id] && materialTypes[item.id].length > 0 && (
                <View style={[adminStyles.chipRow, { marginTop: 3 }]}> 
                  <Text style={[adminStyles.textSecondary, { fontSize: 12 }]}>Types:</Text>
                  {materialTypes[item.id].map(type => (
                    <View key={type.id} style={adminStyles.chip}>
                      <Text style={adminStyles.chipText}>{type.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <TouchableOpacity onPress={() => {
                setEditMaterial(item);
                setNewMaterialName(item.name);
                setNewMaterialUnit(item.unit);
              }} style={[adminStyles.actionBtn, { marginRight: 8 }]}> 
                <Text style={[adminStyles.actionBtnEdit, { color: '#fff', fontSize: 13 }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteMaterial(item.id)} style={adminStyles.actionBtn}> 
                <Text style={[adminStyles.actionBtnDelete, { color: '#fff', fontSize: 13 }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAddTypeModal(item.id)} style={adminStyles.actionBtn}> 
                <Text style={[adminStyles.actionBtnAdd, { color: '#fff', fontSize: 13 }]}>Add Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Fixed position button at bottom */}
      <View style={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: themeColors.background,
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: darkMode ? '#333' : '#e0e0e0'
      }}>
        <TouchableOpacity 
          style={adminStyles.addBtn} 
          onPress={() => setShowAddMaterialModal(true)}
        >
          <Text style={[adminStyles.addBtnText, { color: '#fff' }]}>Add New Material</Text>
        </TouchableOpacity>
      </View>
      {/* Add Material Modal (deduplicated) */}
      <AdminModal visible={showAddMaterialModal} onClose={() => setShowAddMaterialModal(false)} title="Add New Material">
        <TextInput 
          accessibilityLabel="Material Name"
          testID="material-name-input"
          style={adminStyles.inputText} 
          placeholder="Material Name" 
          value={newMaterialName} 
          onChangeText={setNewMaterialName} 
        />
        <TextInput 
          accessibilityLabel="Material Quantity"
          testID="material-quantity-input"
          style={[adminStyles.inputText, { marginTop: 12 }]} 
          placeholder="Unit (e.g., kg, pieces, liters)" 
          value={newMaterialUnit} 
          onChangeText={setNewMaterialUnit} 
        />
        <TouchableOpacity style={[adminStyles.addBtn, { marginTop: 16 }]} onPress={handleAddMaterial}>
          <Text style={[adminStyles.addBtnText, { color: '#fff' }]}>Add Material</Text>
        </TouchableOpacity>
      </AdminModal>
      {/* Add Material Type Modal */}
      <AdminModal visible={!!addTypeModal} onClose={() => setAddTypeModal(null)} title="Add Material Type">
        <TextInput
          style={adminStyles.inputText}
          placeholder="Type Label"
          value={newMaterialTypeLabel}
          onChangeText={setNewMaterialTypeLabel}
          accessibilityLabel="Material Type Label"
          testID="material-type-label-input"
        />
        <TouchableOpacity
          style={adminStyles.addBtn}
          onPress={() => addTypeModal && handleAddMaterialType(addTypeModal)}
          disabled={loading || !newMaterialTypeLabel}
        >
          <Text style={[adminStyles.addBtnText, { color: '#fff' }]}>{loading ? 'Adding...' : 'Add'}</Text>
        </TouchableOpacity>
      </AdminModal>
      {/* Edit Material Modal */}
      <AdminModal visible={!!editMaterial} onClose={() => {
        setEditMaterial(null);
        setNewMaterialName('');
        setNewMaterialUnit('');
      }} title={editMaterial ? `Edit Material: ${editMaterial.name}` : 'Edit Material'}>
        <TextInput
          accessibilityLabel="Material Type Name"
          testID="material-type-name-input"
          style={adminStyles.inputText}
          placeholder="Material Name"
          value={newMaterialName}
          onChangeText={setNewMaterialName}
        />
        <TextInput
          accessibilityLabel="Material Type Quantity"
          testID="material-type-quantity-input"
          style={[adminStyles.inputText, { marginTop: 12 }]}
          placeholder="Unit (e.g., kg, pieces, liters)"
          value={newMaterialUnit}
          onChangeText={setNewMaterialUnit}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <TouchableOpacity style={adminStyles.addBtn} onPress={handleEditMaterial}>
            <Text style={[adminStyles.addBtnText, { color: '#fff' }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.closeBtn} onPress={() => {
            setEditMaterial(null);
            setNewMaterialName('');
            setNewMaterialUnit('');
          }}>
            <Text style={adminStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </AdminModal>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0008', zIndex: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

export default MaterialsTab;