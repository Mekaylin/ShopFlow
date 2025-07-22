import React from 'react';
import { Text } from 'react-native';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { adminStyles } from '../utility/styles';

interface FilterChip {
  label: string;
  value: string;
}

interface SearchAndFilterBarProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  filterChips?: FilterChip[];
  selectedFilter?: string;
  onFilterChange?: (value: string) => void;
  children?: React.ReactNode; // For custom filter dropdowns
}

/**
 * SearchAndFilterBar - reusable search bar with optional filter dropdowns.
 * Usage:
 * <SearchAndFilterBar searchValue={search} onSearchChange={setSearch} placeholder="Search tasks...">
 *   {filterDropdown}
 * </SearchAndFilterBar>
 */
export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchValue,
  onSearchChange,
  placeholder = 'Search...',
  filterChips = [],
  selectedFilter = '',
  onFilterChange,
  children,
}) => (
  <View style={styles.container}>
    <TextInput
      style={styles.input}
      value={searchValue}
      onChangeText={onSearchChange}
      placeholder={placeholder}
      placeholderTextColor="#888"
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
      returnKeyType="search"
    />
    {filterChips.length > 0 && (
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {filterChips.map(chip => (
          <View
            key={chip.value}
            style={{
              backgroundColor: selectedFilter === chip.value ? '#1976d2' : '#eee',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginRight: 8,
            }}
          >
            <Text
              style={{ color: selectedFilter === chip.value ? '#fff' : '#333' }}
              onPress={() => onFilterChange && onFilterChange(chip.value)}
            >
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    )}
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    ...adminStyles.inputText,
    marginBottom: 0,
    marginRight: 8,
  },
});
