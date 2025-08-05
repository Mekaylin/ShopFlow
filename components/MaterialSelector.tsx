import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Material {
  id: string;
  name: string;
  unit: string;
}

interface MaterialType {
  id: string;
  name: string;
}

interface MaterialUsed {
  materialId: string;
  quantity: number;
  materialTypeId?: string;
}

interface MaterialSelectorProps {
  materials: Material[];
  materialTypes: Record<string, MaterialType[]>;
  selectedMaterials: MaterialUsed[];
  onMaterialsChange: (materials: MaterialUsed[]) => void;
  title?: string;
  styles: any;
}

const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materials,
  materialTypes,
  selectedMaterials,
  onMaterialsChange,
  title = "Add Materials Used",
  styles,
}) => {
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState('');

  const addMaterial = () => {
    if (!selectedMaterial || !materialQuantity || isNaN(Number(materialQuantity))) {
      Alert.alert('Invalid Input', 'Please select a material and enter a valid quantity.');
      return;
    }

    const newMaterial: MaterialUsed = {
      materialId: selectedMaterial,
      quantity: Number(materialQuantity),
      materialTypeId: selectedMaterialType || undefined,
    };

    onMaterialsChange([...selectedMaterials, newMaterial]);
    
    // Reset form
    setSelectedMaterial(null);
    setSelectedMaterialType(null);
    setMaterialQuantity('');
  };

  const removeMaterial = (index: number) => {
    const updatedMaterials = selectedMaterials.filter((_, i) => i !== index);
    onMaterialsChange(updatedMaterials);
  };

  return (
    <View style={{ marginTop: 12, marginBottom: 12, backgroundColor: '#f5faff', borderRadius: 10, padding: 10 }}>
      <Text style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 4 }}>{title}</Text>
      
      {/* Material Selection */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ marginRight: 6 }}>Material:</Text>
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {materials.map(mat => (
              <TouchableOpacity
                key={mat.id}
                style={{
                  backgroundColor: selectedMaterial === mat.id ? '#1976d2' : '#e3f2fd',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginRight: 6,
                }}
                onPress={() => {
                  setSelectedMaterial(mat.id);
                  setSelectedMaterialType(null); // Reset type when material changes
                }}
              >
                <Text style={{ color: selectedMaterial === mat.id ? '#fff' : '#1976d2' }}>{mat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Material Type Selection */}
      {selectedMaterial && (materialTypes[selectedMaterial]?.length > 0) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ marginRight: 6 }}>Type:</Text>
          <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(materialTypes[selectedMaterial] || []).map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={{
                    backgroundColor: selectedMaterialType === type.id ? '#1976d2' : '#e3f2fd',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginRight: 6,
                  }}
                  onPress={() => setSelectedMaterialType(type.id)}
                >
                  <Text style={{ color: selectedMaterialType === type.id ? '#fff' : '#1976d2' }}>{type.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Quantity Input */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ marginRight: 6 }}>Quantity:</Text>
        <TextInput
          style={[styles.inputText, { flex: 1 }]}
          placeholder="Quantity"
          value={materialQuantity}
          onChangeText={setMaterialQuantity}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addMaterial}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Materials Display */}
      {selectedMaterials.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Selected Materials:</Text>
          {selectedMaterials.map((mu, idx) => {
            const mat = materials.find(m => m.id === mu.materialId);
            const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ fontSize: 14, flex: 1 }}>
                  {mat?.name}{type ? ` (${type.name})` : ''}: {mu.quantity} {mat?.unit}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#f44336', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                  onPress={() => removeMaterial(idx)}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default MaterialSelector;
