// components/utility/styles.ts
// Shared styles for ShopFlow admin components
import { StyleSheet, ViewStyle } from 'react-native';

// Shared base style objects for DRYness
const baseCard: ViewStyle = {
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
  shadowColor: '#000',
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};
const baseButton: ViewStyle = {
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
};
const baseInput: ViewStyle = {
  borderWidth: 1,
  borderRadius: 8,
  padding: 12,
};
const baseListItem: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
};
const baseModal: ViewStyle = {
  borderRadius: 16,
  padding: 24,
  margin: 20,
  maxWidth: 400,
  width: '100%' as any, // Cast to any to satisfy ViewStyle
  shadowColor: '#000',
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 8,
};
const baseStatsCard: ViewStyle = {
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  alignItems: 'center',
  shadowColor: '#000',
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const adminStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: '#f5faff',
  },
  darkContainer: {
    flex: 1,
    backgroundColor: '#181a20',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    ...baseCard,
    backgroundColor: '#fff',
    shadowOpacity: 0.1,
  },
  darkCard: {
    ...baseCard,
    backgroundColor: '#2a2d3a',
    shadowOpacity: 0.3,
  },

  // Typography styles
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  darkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  darkSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64b5f6',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#333',
  },
  darkText: {
    fontSize: 14,
    color: '#e0e0e0',
  },
  textSecondary: {
    fontSize: 12,
    color: '#666',
  },
  darkTextSecondary: {
    fontSize: 12,
    color: '#b0b0b0',
  },

  // Button styles
  button: {
    backgroundColor: '#1976d2',
    ...baseButton,
    shadowColor: '#1976d2',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  darkButtonSecondary: {
    backgroundColor: '#3a3d4a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  darkButtonTextSecondary: {
    color: '#e0e0e0',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSmall: {
    backgroundColor: '#1976d2',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmallText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Input styles
  input: {
    ...baseInput,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    color: '#333',
  },
  darkInput: {
    ...baseInput,
    borderColor: '#555',
    backgroundColor: '#3a3d4a',
    color: '#e0e0e0',
  },
  inputError: {
    borderColor: '#f44336',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  darkInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 8,
  },

  // List styles
  listItem: {
    ...baseListItem,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  darkListItem: {
    ...baseListItem,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3d4a',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  darkListItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0e0e0',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  darkListItemSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 2,
  },

  // Status styles
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCompleted: {
    backgroundColor: '#4caf50',
  },
  statusPending: {
    backgroundColor: '#ff9800',
  },
  statusLate: {
    backgroundColor: '#f44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    ...baseModal,
    backgroundColor: '#fff',
    shadowOpacity: 0.25,
  },
  darkModalContent: {
    ...baseModal,
    backgroundColor: '#2a2d3a',
    shadowOpacity: 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Form styles
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  darkFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 8,
  },
  formError: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },

  // Grid styles
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    padding: 8,
  },
  gridItemFull: {
    width: '100%',
    padding: 8,
  },

  // Stats styles
  statsCard: {
    ...baseStatsCard,
    backgroundColor: '#fff',
    shadowOpacity: 0.1,
  },
  darkStatsCard: {
    ...baseStatsCard,
    backgroundColor: '#2a2d3a',
    shadowOpacity: 0.3,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  darkStatsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64b5f6',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  darkStatsLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    textAlign: 'center',
  },

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  darkLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#b0b0b0',
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  darkEmptyText: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
    marginTop: 16,
  },

  // Search styles
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    ...baseInput,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    color: '#333',
  },
  darkSearchInput: {
    ...baseInput,
    borderColor: '#555',
    backgroundColor: '#3a3d4a',
    color: '#e0e0e0',
  },

  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  darkFilterChip: {
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '600',
  },
  darkFilterChipText: {
    color: '#64b5f6',
    fontSize: 12,
    fontWeight: '600',
  },

  // Action styles
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },

  // Rating styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    marginRight: 4,
  },

  // Progress styles
  progressContainer: {
    marginVertical: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  darkProgressBar: {
    height: 8,
    backgroundColor: '#3a3d4a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },

  // Divider styles
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  darkDivider: {
    height: 1,
    backgroundColor: '#3a3d4a',
    marginVertical: 16,
  },

  // Spacing utilities
  marginTop: {
    marginTop: 16,
  },
  marginBottom: {
    marginBottom: 16,
  },
  padding: {
    padding: 16,
  },
  paddingHorizontal: {
    paddingHorizontal: 16,
  },
  paddingVertical: {
    paddingVertical: 16,
  },

  // Flex utilities
  flex1: {
    flex: 1,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  alignItemsCenter: {
    alignItems: 'center',
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  justifyContentSpaceAround: {
    justifyContent: 'space-around',
  },

  // Text utilities
  textCenter: {
    textAlign: 'center',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  textBold: {
    fontWeight: 'bold',
  },
  textItalic: {
    fontStyle: 'italic',
  },

  // Color utilities
  textPrimary: {
    color: '#1976d2',
  },

  textSuccess: {
    color: '#4caf50',
  },
  textWarning: {
    color: '#ff9800',
  },
  textError: {
    color: '#f44336',
  },
  darkTextPrimary: {
    color: '#64b5f6',
  },
 
  darkTextSuccess: {
    color: '#81c784',
  },
  darkTextWarning: {
    color: '#ffb74d',
  },
  darkTextError: {
    color: '#e57373',
  },

  // --- Restored styles for admin components ---

  // Save button styles
  saveBtn: {
    ...baseButton,
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Add button styles
  addBtn: {
    ...baseButton,
    backgroundColor: '#1976d2',
    marginTop: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Close button styles
  closeBtn: {
    ...baseButton,
    backgroundColor: '#888',
    marginTop: 8,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Section title
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },

  // Settings modal card and title
  settingsCard: {
    ...baseCard,
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  timeInput: {
    ...baseInput,
    borderColor: '#1976d2',
    backgroundColor: '#fff',
    color: '#333',
    width: 100,
    marginRight: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginRight: 8,
  },
  logoutBtn: {
    ...baseButton,
    backgroundColor: '#f44336',
    marginTop: 16,
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Add employee modal styles
  addEmployeeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  addEmployeeCard: {
    ...baseCard,
    backgroundColor: '#f5faff',
    marginBottom: 8,
    padding: 16,
  },
  addEmployeeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },

  // Dropdown styles
  dropdownContainer: {
    flex: 1,
    marginBottom: 8,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },

  // Large input style
  inputLarge: {
    ...baseInput,
    fontSize: 16,
    padding: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  // Dedicated style for TextInput (TextStyle only)
  inputText: {
    color: '#333',
    fontSize: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
}); 