// Demo script to test the South African License Disk barcode parsing
// Run this to see how the parsing function works with sample data

interface VehicleData {
  License: string;
  Make: string;
  VIN: string;
  Model: string;
  Year: string;
  Owner: string;
  ID: string;
}

const parseVehicleData = (data: string): VehicleData | null => {
  try {
    // Split by pipe character and create key-value pairs
    const parts = data.split('|');
    const parsed: Partial<VehicleData> = {};

    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        switch (key.trim()) {
          case 'L':
            parsed.License = value.trim();
            break;
          case 'M':
            parsed.Make = value.trim();
            break;
          case 'V':
            parsed.VIN = value.trim();
            break;
          case 'C':
            parsed.Model = value.trim();
            break;
          case 'Y':
            parsed.Year = value.trim();
            break;
          case 'R':
            parsed.Owner = value.trim();
            break;
          case 'ID':
            parsed.ID = value.trim();
            break;
        }
      }
    });

    // Validate that we have the required fields
    if (parsed.License && parsed.Make && parsed.VIN && parsed.Model && parsed.Year && parsed.Owner && parsed.ID) {
      return parsed as VehicleData;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing vehicle data:', error);
    return null;
  }
};

// Test with sample barcode data
const sampleBarcodeData = "L:AB12CDGP|M:Toyota|V:XYZ123456789|C:Corolla|Y:2019|R:John Doe|ID:8001015009087";

console.log('Sample barcode data:', sampleBarcodeData);
console.log('Parsed result:', parseVehicleData(sampleBarcodeData));

// Test with invalid data
const invalidData = "Invalid barcode data";
console.log('Invalid data test:', parseVehicleData(invalidData));

export { parseVehicleData };
