import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { adminStyles } from '../utility/styles';
import { Material, MaterialType } from '../utility/types';
import AdminModal from './AdminModal';

import type { User } from '../utility/types';
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
  // Material state
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');
  const [newMaterialTypeLabel, setNewMaterialTypeLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  // Modal state from navigation
  const addMaterialModal = params.addMaterial === '1';
  const addTypeModal = typeof params.addType === 'string' ? params.addType : null;

  // Reset modal state when opening/closing
  React.useEffect(() => {
    if (!addMaterialModal) {
      setNewMaterialName('');
      setNewMaterialUnit('');
    }
  }, [addMaterialModal]);
  React.useEffect(() => {
    if (!addTypeModal) {
      setNewMaterialTypeLabel('');
    }
  }, [addTypeModal]);

  // Material CRUD handlers
  const handleAddMaterial = async () => {
    if (!user || !user.business_id) {
      Alert.alert('Auth Error', 'User session missing. Please log in again.');
      return;
    }
    if (!newMaterialName.trim() || !newMaterialUnit.trim()) {
      Alert.alert('Missing Fields', 'Please enter both name and unit.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert({
          name: newMaterialName.trim(),
          unit: newMaterialUnit.trim(),
          business_id: user.business_id,
        })
        .select('*');
      if (error) {
        Alert.alert('Failed to add material', error.message);
        return;
      }
      // Refetch materials for this business only
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
      setNewMaterialName('');
      setNewMaterialUnit('');
      router.back();
    } catch (err: any) {
      Alert.alert('Unexpected error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEditMaterial = async () => {
    if (!editMaterial) return;
    if (!newMaterialName.trim() || !newMaterialUnit.trim()) {
      Alert.alert('Missing Fields', 'Please enter both name and unit.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('materials')
        .update({
          name: newMaterialName.trim(),
          unit: newMaterialUnit.trim(),
        })
        .eq('id', editMaterial.id)
        .eq('business_id', user.business_id)
        .select('*');
      if (error) {
        Alert.alert('Failed to update material', error.message);
        return;
      }
      // Refetch materials for this business only
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
      setEditMaterial(null);
      setNewMaterialName('');
      setNewMaterialUnit('');
    } catch (err: any) {
      Alert.alert('Unexpected error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!user || !user.business_id) {
      Alert.alert('Auth Error', 'User session missing. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)
        .eq('business_id', user.business_id);
      if (error) {
        Alert.alert('Error', error?.message || 'Failed to delete material.');
        return;
      }
      // Refetch materials for this business only
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
    } catch (fetchErr: any) {
      Alert.alert('Refetch Materials Error', fetchErr?.message || String(fetchErr));
    } finally {
      setLoading(false);
    }
  };

  // Add Material Type logic
  // Material types are managed in state only; for multi-business, ensure types are per business
  const handleAddMaterialType = (materialId: string) => {
    if (!newMaterialTypeLabel.trim()) return;
    const newType = {
      id: `${user.business_id}-${Date.now()}`,
      name: newMaterialTypeLabel.trim(),
      business_id: user.business_id
    };
    const updated = {
      ...materialTypes,
      [materialId]: [...(materialTypes[materialId] || []).filter(t => t.business_id === user.business_id), newType]
    };
    setMaterialTypes(updated);
    setNewMaterialTypeLabel('');
  };

  return (
    <View style={darkMode ? adminStyles.darkContainer : adminStyles.container}>
      <Text style={[adminStyles.sectionTitle, { marginBottom: 8 }]}>Materials</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {materials.map(item => (
          <View key={item.id} style={[darkMode ? adminStyles.darkCard : adminStyles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
            <View style={{ flex: 1 }}>
              <Text style={[adminStyles.subtitle, darkMode && adminStyles.darkSubtitle, { fontSize: 16 }]}> 
                {item.name} <Text style={adminStyles.textSecondary}>({item.unit})</Text>
              </Text>
              {/* Only show the name, not 'Material Name' */}
              {materialTypes[item.id] && materialTypes[item.id].length > 0 && (
                <View style={[adminStyles.chipRow, { marginTop: 4 }]}> 
                  <Text style={adminStyles.textSecondary}>Types:</Text>
                  {materialTypes[item.id].map(type => (
                    <View key={type.id} style={adminStyles.chip}>
                      <Text style={adminStyles.chipText}>{type.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => {
                setEditMaterial(item);
                setNewMaterialName(item.name);
                setNewMaterialUnit(item.unit);
              }} style={adminStyles.actionBtn}>
                <Text style={[adminStyles.actionBtnEdit, { color: '#000' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteMaterial(item.id)} style={adminStyles.actionBtn}>
                <Text style={[adminStyles.actionBtnDelete, { color: '#000' }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push({ pathname: '/admin-dashboard', params: { ...params, addType: item.id } })} style={adminStyles.actionBtn}>
                <Text style={[adminStyles.actionBtnAdd, { color: '#000' }]}>Add Type</Text>
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
        backgroundColor: darkMode ? '#181a20' : '#f5f6fa',
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: darkMode ? '#333' : '#e0e0e0'
      }}>
        <TouchableOpacity
          style={adminStyles.addBtn}
          onPress={() => router.push({ pathname: '/admin-dashboard', params: { ...params, addMaterial: '1' } })}
        >
          <Text style={[adminStyles.addBtnText, { color: '#000' }]}>Add New Material</Text>
        </TouchableOpacity>
      </View>

      {/* Add Material Modal */}
      <AdminModal visible={!!addMaterialModal} onClose={() => router.back()} title="Add New Material">
        <TextInput
          style={adminStyles.inputText}
          placeholder="Material Name"
          value={newMaterialName}
          onChangeText={setNewMaterialName}
        />
        <TextInput
          style={[adminStyles.inputText, { marginTop: 12 }]}
          placeholder="Unit (e.g., kg, pieces, liters)"
          value={newMaterialUnit}
          onChangeText={setNewMaterialUnit}
        />
        <TouchableOpacity style={[adminStyles.addBtn, { marginTop: 16 }]} onPress={handleAddMaterial}>
          <Text style={[adminStyles.addBtnText, { color: '#000' }]}>Add Material</Text>
        </TouchableOpacity>
      </AdminModal>

      {/* Edit Material Modal */}
      <AdminModal visible={!!editMaterial} onClose={() => { setEditMaterial(null); setNewMaterialName(''); setNewMaterialUnit(''); }} title="Edit Material">
        <TextInput
          style={adminStyles.inputText}
          placeholder="Material Name"
          value={newMaterialName}
          onChangeText={setNewMaterialName}
        />
        <TextInput
          style={[adminStyles.inputText, { marginTop: 12 }]}
          placeholder="Unit (e.g., kg, pieces, liters)"
          value={newMaterialUnit}
          onChangeText={setNewMaterialUnit}
        />
        <TouchableOpacity style={[adminStyles.saveBtn, { marginTop: 16 }]} onPress={handleEditMaterial}>
          <Text style={adminStyles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </AdminModal>

      {/* Add Material Type Modal */}
      <AdminModal visible={!!addTypeModal} onClose={() => router.back()} title="Add Material Type">
        <TextInput style={adminStyles.inputText} placeholder="Type Label" value={newMaterialTypeLabel} onChangeText={setNewMaterialTypeLabel} />
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => addTypeModal && handleAddMaterialType(addTypeModal)}>
          <Text style={[adminStyles.addBtnText, { color: '#000' }]}>Add</Text>
        </TouchableOpacity>
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