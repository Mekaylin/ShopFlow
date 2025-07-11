import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/cloud.js';
import { adminStyles } from '../utility/styles';
import { Material, MaterialType } from '../utility/types';
import AdminModal from './AdminModal';

interface MaterialsTabProps {
  user: any;
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
  const [selectedMaterialIdForType, setSelectedMaterialIdForType] = useState<string | null>(null);

  // Material CRUD handlers
  const handleAddMaterial = async () => {
    if (!newMaterialName || !newMaterialUnit) {
      Alert.alert('Missing Fields', 'Please enter both name and unit.');
      return;
    }
    const { data, error } = await supabase
      .from('materials')
      .insert({
        name: newMaterialName,
        unit: newMaterialUnit,
        business_id: user.business_id,
      })
      .select('*')
      .single();
    if (error || !data) {
      Alert.alert('Error', error?.message || 'Failed to add material.');
      return;
    }
    // Refetch materials from Supabase
    try {
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
    } catch (fetchErr) {
      console.error('Refetch materials error:', fetchErr);
    }
    setNewMaterialName('');
    setNewMaterialUnit('');
  };

  const handleEditMaterial = async () => {
    if (!editMaterial) return;
    if (!newMaterialName || !newMaterialUnit) {
      Alert.alert('Missing Fields', 'Please enter both name and unit.');
      return;
    }
    const { data, error } = await supabase
      .from('materials')
      .update({
        name: newMaterialName,
        unit: newMaterialUnit,
      })
      .eq('id', editMaterial.id)
      .select('*')
      .single();
    if (error || !data) {
      Alert.alert('Error', error?.message || 'Failed to edit material.');
      return;
    }
    // Refetch materials from Supabase
    try {
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
    } catch (fetchErr) {
      console.error('Refetch materials error:', fetchErr);
    }
    setEditMaterial(null);
    setNewMaterialName('');
    setNewMaterialUnit('');
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    if (error) {
      Alert.alert('Error', error?.message || 'Failed to delete material.');
      return;
    }
    // Refetch materials from Supabase
    try {
      const { data: allMaterials, error: fetchError } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!fetchError && allMaterials) setMaterials(allMaterials);
    } catch (fetchErr) {
      console.error('Refetch materials error:', fetchErr);
    }
  };

  // Add Material Type logic
  const handleAddMaterialType = (materialId: string) => {
    if (!newMaterialTypeLabel) return;
    const newType = { id: Date.now().toString(), name: newMaterialTypeLabel, business_id: user.business_id };
    // Always pass a value, not a function, to setMaterialTypes
    const updated = {
      ...materialTypes,
      [materialId]: [...(materialTypes[materialId] || []), newType]
    };
    setMaterialTypes(updated);
    setNewMaterialTypeLabel('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 8 }}>
      <Text style={[adminStyles.sectionTitle, { marginBottom: 8 }]}>Materials</Text>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {materials.map(item => (
          <View key={item.id} style={{
            backgroundColor: darkMode ? '#23263a' : '#fff',
            borderRadius: 14,
            marginBottom: 10,
            padding: 14,
            shadowColor: '#1976d2',
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: darkMode ? '#b3c0e0' : '#1976d2', fontSize: 16 }}>{item.name} <Text style={{ color: '#888', fontWeight: 'normal' }}>({item.unit})</Text></Text>
              {/* Only show the name, not 'Material Name' */}
              {materialTypes[item.id] && materialTypes[item.id].length > 0 && (
                <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Types:</Text>
                  {materialTypes[item.id].map(type => (
                    <View key={type.id} style={{ backgroundColor: '#e3f2fd', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4, marginBottom: 2 }}>
                      <Text style={{ fontSize: 13, color: '#1976d2' }}>{type.name}</Text>
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
              }} style={{ marginRight: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteMaterial(item.id)} style={{ marginRight: 8 }}>
                <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedMaterialIdForType(item.id)}>
                <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Add Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 8 }}>
        <TextInput style={[adminStyles.inputText, { flex: 2, marginRight: 6 }]} placeholder="Name" value={newMaterialName} onChangeText={setNewMaterialName} />
        <TextInput style={[adminStyles.inputText, { flex: 1, marginRight: 6 }]} placeholder="Unit" value={newMaterialUnit} onChangeText={setNewMaterialUnit} />
        <TouchableOpacity style={adminStyles.addBtn} onPress={handleAddMaterial}>
          <Text style={adminStyles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      {editMaterial && (
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <TextInput style={[adminStyles.inputText, { flex: 2, marginRight: 6 }]} placeholder="Name" value={newMaterialName} onChangeText={setNewMaterialName} />
          <TextInput style={[adminStyles.inputText, { flex: 1, marginRight: 6 }]} placeholder="Unit" value={newMaterialUnit} onChangeText={setNewMaterialUnit} />
          <TouchableOpacity style={adminStyles.saveBtn} onPress={handleEditMaterial}>
            <Text style={adminStyles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Material Type Modal */}
      <AdminModal visible={!!selectedMaterialIdForType} onClose={() => setSelectedMaterialIdForType(null)} title="Add Material Type">
        <TextInput style={adminStyles.inputText} placeholder="Type Label" value={newMaterialTypeLabel} onChangeText={setNewMaterialTypeLabel} />
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => selectedMaterialIdForType && handleAddMaterialType(selectedMaterialIdForType)}>
          <Text style={adminStyles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </AdminModal>
    </View>
  );
};

export default MaterialsTab; 