
import { StyleSheet } from 'react-native';

export const baseButton = {
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
};
const baseCard = {
  borderRadius: 14,
  padding: 24,
  backgroundColor: '#fff',
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const adminStyles = StyleSheet.create({
  // Modal overlay/content styles for admin modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  taskListText: {
    fontSize: 15,
    marginBottom: 4,
  },
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  darkContainer: {
    flex: 1,
    backgroundColor: '#181a20',
    padding: 16,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAround: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  // Subtitles and secondary text
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  darkSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eee',
    marginBottom: 4,
  },
  textSecondary: {
    color: '#888',
    fontSize: 13,
  },
  textError: {
    color: '#d32f2f',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginVertical: 2,
  },
  chip: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },

  // Action buttons (legacy names)
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#1976d2',
    marginTop: 6,
  },
  actionBtnEdit: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actionBtnDelete: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actionBtnAdd: {
    color: '#388e3c',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Add/Save/Close buttons
  addBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#388e3c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeBtn: {
    backgroundColor: '#888',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Input
  inputText: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#222',
    marginBottom: 8,
  },

  // Settings
  settingsCard: {
    ...baseCard,
    marginBottom: 16,
    backgroundColor: '#f5f6fa',
  },
  settingsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 15,
    color: '#333',
    marginRight: 8,
  },
  logoutBtn: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Add employee modal
  addEmployeeTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  addEmployeeCard: {
    ...baseCard,
    marginBottom: 12,
    backgroundColor: '#f5f6fa',
  },
  addEmployeeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Dropdowns
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
    padding: 4,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 15,
    color: '#222',
  },

  // Cards
  card: {
    ...baseCard,
    marginBottom: 16,
  },
  darkCard: {
    ...baseCard,
    backgroundColor: '#23262f',
    borderColor: '#333',
    borderWidth: 1,
  },

  // Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bgPrimary: {
    backgroundColor: '#1976d2',
  },
  bgSuccess: {
    backgroundColor: '#4CAF50',
  },
  flex1: {
    flex: 1,
  },
  mr8: {
    marginRight: 8,
  },
  ml8: {
    marginLeft: 8,
  },

  // Spacing
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
  mt4: {
    marginTop: 4,
  },

  // Typography
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#333',
  },
  starText: {
    fontSize: 15,
    color: '#FFD700',
    marginLeft: 8,
  },

  // Star button
  starBtn: {
    padding: 4,
  },

  // Stats
  statsCol: {
    alignItems: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  textPrimary: {
    color: '#1976d2',
  },
  textGold: {
    color: '#FFD700',
  },
  textSuccess: {
    color: '#4CAF50',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 8,
  },
  // tabButton and tabButtonText are exported as standalone functions below
  tabIcon: {
    marginBottom: 2,
  },
  tabContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suspenseFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suspenseText: {
    marginTop: 12,
  },
  flatListContent: {
    paddingBottom: 16,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 32,
  },
});

// Dynamic styles for tab buttons (not part of StyleSheet.create)
export const tabButton = (active: boolean, dark: boolean) => ({
  flex: 1,
  paddingVertical: 8,
  backgroundColor: active ? (dark ? '#222b45' : '#1976d2') : (dark ? '#333950' : '#e3f2fd'),
  borderRadius: 8,
  marginHorizontal: 2,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column' as const,
});

export const tabButtonText = (active: boolean, dark: boolean) => ({
  color: active ? '#fff' : (dark ? '#b3c0e0' : '#1976d2'),
  fontWeight: 'bold' as const,
  textAlign: 'center' as const,
  fontSize: 11,
});