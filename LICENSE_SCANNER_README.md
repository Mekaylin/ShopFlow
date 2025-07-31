# South African License Disk Scanner

This feature allows users to scan South African vehicle license disks using the device camera and automatically parse the vehicle information from the PDF417 barcode.

## Features

- **Camera-based scanning**: Uses the device camera to scan PDF417 barcodes
- **Data parsing**: Automatically extracts vehicle information from the barcode
- **Editable form**: Allows users to review and edit scanned data
- **Validation**: Ensures all required fields are present before proceeding

## Files Created

1. **`app/screens/LicenseDiskScannerScreen.tsx`** - Main scanner screen component
2. **`app/license-scanner.tsx`** - Route file for navigation
3. **`components/ui/ScanLicenseDiskButton.tsx`** - Reusable button component to access scanner
4. **`utils/vehicleDataParser.ts`** - Utility functions for parsing barcode data

## Usage

### 1. Navigate to Scanner
You can navigate to the scanner in several ways:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/license-scanner');
```

Or use the provided button component:

```typescript
import ScanLicenseDiskButton from '@/components/ui/ScanLicenseDiskButton';

<ScanLicenseDiskButton style={{ margin: 16 }} />
```

### 2. Barcode Format
The scanner expects PDF417 barcodes with this format:
```
L:AB12CDGP|M:Toyota|V:XYZ123456789|C:Corolla|Y:2019|R:John Doe|ID:8001015009087
```

Where:
- `L` = License plate number
- `M` = Vehicle make
- `V` = VIN (Vehicle Identification Number)
- `C` = Vehicle model
- `Y` = Year of manufacture
- `R` = Registered owner
- `ID` = Owner's ID number

### 3. Integration with Existing App

To add the scanner to your Employee or Admin Dashboard:

```typescript
import ScanLicenseDiskButton from '../components/ui/ScanLicenseDiskButton';

// In your dashboard component:
<View style={{ padding: 16 }}>
  <ScanLicenseDiskButton />
</View>
```

### 4. Handling Scanned Data

The scanner automatically parses the data and presents it in an editable form. You can customize what happens when the user confirms the data by modifying the `handleConfirm` function in `LicenseDiskScannerScreen.tsx`.

## Permissions

The scanner requires camera permissions, which are automatically requested when the user first accesses the scanner.

## Dependencies

- `expo-barcode-scanner`: For camera-based barcode scanning
- `@expo/vector-icons`: For UI icons
- `expo-router`: For navigation

## Testing

To test the barcode parsing functionality without a physical barcode:

```typescript
import { parseVehicleData } from '@/utils/vehicleDataParser';

const testData = "L:AB12CDGP|M:Toyota|V:XYZ123456789|C:Corolla|Y:2019|R:John Doe|ID:8001015009087";
const result = parseVehicleData(testData);
console.log(result);
```

## Customization

### Styling
All styles are contained within the `LicenseDiskScannerScreen.tsx` file and can be customized to match your app's theme.

### Data Processing
Modify the `handleConfirm` function to integrate with your data storage or processing systems:

```typescript
const handleConfirm = () => {
  if (editableData) {
    // Save to database, send to API, etc.
    saveVehicleData(editableData);
    
    // Navigate to next screen
    router.push('/vehicle-details');
  }
};
```

### Validation
Add custom validation rules in the parsing function or before confirming data:

```typescript
const validateVehicleData = (data: VehicleData): boolean => {
  // Add your validation logic here
  return data.Year.length === 4 && !isNaN(Number(data.Year));
};
```

## Error Handling

The scanner includes comprehensive error handling for:
- Invalid camera permissions
- Malformed barcode data
- Missing required fields
- Camera access failures

## Platform Support

- ✅ iOS
- ✅ Android  
- ❌ Web (camera access limitations)

## Next Steps

1. Test the scanner with actual South African license disk barcodes
2. Integrate with your existing data storage system
3. Add the scanner button to your dashboards
4. Customize styling to match your app theme
5. Add additional validation rules as needed
