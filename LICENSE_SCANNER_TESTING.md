# 🧪 License Scanner Testing Checklist

## ✅ Pre-Testing Setup

### 1. Database Setup
- [ ] SQL schema executed in Supabase (should see "Success. No rows returned")
- [ ] `vehicle_scans` table exists in Supabase Table Editor
- [ ] RLS policies are active (check Authentication > Policies)

### 2. App Status
- [ ] Expo development server running (`exp://192.168.8.45:8083`)
- [ ] No compilation errors in VS Code
- [ ] Admin user logged in to the app

## 🎯 Test Cases

### Test 1: Basic Navigation
- [ ] Open admin dashboard
- [ ] Navigate to "License Scanner" tab (camera icon)
- [ ] Verify tab opens without errors
- [ ] Check statistics show 0 scans initially

### Test 2: Scanner Modal
- [ ] Tap "Scan License" button
- [ ] Verify camera permission request appears
- [ ] Grant camera permissions
- [ ] Verify scanner screen opens in modal
- [ ] Check camera preview is working

### Test 3: Test QR Code Scanning

#### Generate Test QR Code:
1. Go to [qr-code-generator.com](https://www.qr-code-generator.com)
2. Select "Text" type
3. Copy this test data:
   ```
   L:AB12CDGP|M:Toyota|V:XYZ123456789|C:Corolla|Y:2019|R:John Doe|ID:8001015009087
   ```
4. Paste and generate QR code
5. Display on another device/computer screen

#### Scan Process:
- [ ] Point camera at test QR code
- [ ] Verify barcode detection (should trigger scan)
- [ ] Check console logs for: "📷 Barcode scanned!" and "🔍 Parsed vehicle data:"
- [ ] Verify data parsing screen appears
- [ ] Check all fields populated correctly:
  - License Number: AB12CDGP
  - Make: Toyota
  - Model: Corolla
  - Year: 2019
  - VIN: XYZ123456789
  - Owner: John Doe
  - ID Number: 8001015009087

### Test 4: Data Editing
- [ ] Tap "Edit" button on parsed data
- [ ] Modify any field (e.g., change year to 2020)
- [ ] Tap "Done" to finish editing
- [ ] Verify changes are saved in the form

### Test 5: Data Confirmation & Save
- [ ] Tap "Confirm Data" button
- [ ] Check console logs for: "✅ Calling onScanComplete with data:"
- [ ] Check console logs for: "💾 Creating scan record..." and "✅ Scan saved successfully:"
- [ ] Verify success message appears: "Vehicle Recorded"
- [ ] Verify modal closes automatically

### Test 6: Dashboard Updates
- [ ] Back in License Scanner tab
- [ ] Verify statistics updated:
  - Total Scanned: 1
  - Today: 1
  - Scanners: 1
- [ ] Verify new scan appears in recent scans list
- [ ] Check all data displays correctly in the record card

### Test 7: Duplicate Detection
- [ ] Scan the same QR code again
- [ ] Verify duplicate warning appears
- [ ] Test both "Cancel" and "Scan Anyway" options

### Test 8: Record Actions (Admin Only)
- [ ] Verify green checkmark for unverified scans (if admin)
- [ ] Tap verify button (green checkmark)
- [ ] Verify "Verified" badge appears
- [ ] Test delete button (trash icon)
- [ ] Confirm deletion works

### Test 9: Data Persistence
- [ ] Close and reopen the app
- [ ] Navigate back to License Scanner tab
- [ ] Verify all scans are still there
- [ ] Verify statistics are correct

### Test 10: Multiple Vehicle Types
Test with different vehicle data:

**BMW Test:**
```
L:CD34EFGH|M:BMW|V:ABC987654321|C:320i|Y:2021|R:Jane Smith|ID:9001015009087
```

**Ford Test:**
```
L:EF56GHIJ|M:Ford|V:DEF456789012|C:Ranger|Y:2020|R:Bob Johnson|ID:7501015009087
```

## 🐛 Troubleshooting

### Common Issues & Solutions:

#### Scanner doesn't open:
- Check camera permissions in device settings
- Verify no compilation errors in console
- Check that modal state is properly managed

#### QR code not scanning:
- Ensure QR code contains text (not URL/other type)
- Check lighting conditions
- Try generating a larger QR code
- Verify the text format matches exactly: `L:xxx|M:xxx|V:xxx|C:xxx|Y:xxx|R:xxx|ID:xxx`

#### Data not saving:
- Check Supabase connection in console logs
- Verify user has business_id set
- Check RLS policies are not blocking the operation
- Look for error messages in console

#### Statistics not updating:
- Check console logs for loading errors
- Verify the `get_scan_statistics` function exists in Supabase
- Try pull-to-refresh on the scanner tab

#### Blank/missing data:
- Verify all required fields are in QR code
- Check parsing logic in console logs
- Ensure business_id is correctly set on user

## 📊 Success Criteria

The license scanner is working correctly if:
- ✅ QR codes scan and parse correctly
- ✅ Data saves to Supabase database
- ✅ Statistics update in real-time
- ✅ Duplicate detection works
- ✅ Records display in dashboard
- ✅ Admin actions (verify/delete) work
- ✅ Data persists between app sessions

## 🔍 Console Debug Output

Look for these log messages during testing:
- `📊 Loading scan data for business: [business-id]`
- `📷 Barcode scanned! {type: ..., data: ...}`
- `🔍 Parsed vehicle data: {...}`
- `✅ Calling onScanComplete with data: {...}`
- `💾 Creating scan record...`
- `✅ Scan saved successfully: {...}`
- `🔄 Refreshing data...`
- `📈 Loaded scans: X records`

Any errors should also appear in the console with ❌ or 💥 emojis.
