// Test data for License Scanner
// Use this format to create test QR codes for scanning

export const testLicenseData = {
  // Example 1: Toyota Corolla
  toyota: "L:AB12CDGP|M:Toyota|V:XYZ123456789|C:Corolla|Y:2019|R:John Doe|ID:8001015009087",
  
  // Example 2: BMW 320i
  bmw: "L:CD34EFGH|M:BMW|V:ABC987654321|C:320i|Y:2021|R:Jane Smith|ID:9001015009087",
  
  // Example 3: Ford Ranger
  ford: "L:EF56GHIJ|M:Ford|V:DEF456789012|C:Ranger|Y:2020|R:Bob Johnson|ID:7501015009087",
  
  // Example 4: Volkswagen Polo
  vw: "L:GH78IJKL|M:Volkswagen|V:GHI789012345|C:Polo|Y:2018|R:Sarah Wilson|ID:8501015009087",
  
  // Example 5: Nissan Navara
  nissan: "L:IJ90KLMN|M:Nissan|V:JKL012345678|C:Navara|Y:2022|R:Mike Davis|ID:8201015009087"
};

// Instructions for testing:
// 1. Go to any QR code generator website (e.g., qr-code-generator.com)
// 2. Select "Text" type
// 3. Copy one of the strings above (e.g., testLicenseData.toyota)
// 4. Paste it into the text field
// 5. Generate and display the QR code
// 6. Scan it with your app
//
// The format is: L:License|M:Make|V:VIN|C:Model|Y:Year|R:Owner|ID:IDNumber

export default testLicenseData;
