const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // You'll need to set up your Firebase service account key
  // For now, we'll use the web SDK approach
  console.log('This script requires Firebase Admin SDK setup.');
  console.log('Please use the browser console method instead.');
  console.log('');
  console.log('Instructions:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Make sure you are logged in');
  console.log('3. Open browser developer console (F12)');
  console.log('4. Copy and paste the following code:');
  console.log('');
  
  // Read the GeoJSON file
  const geoJsonPath = path.join(__dirname, 'src', 'data', 'cambodia-provinces.json');
  const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
  
  console.log('// Upload Cambodia Provinces to Database');
  console.log('(async function uploadProvinces() {');
  console.log('  const geoJsonData = ' + JSON.stringify(geoJsonData, null, 2) + ';');
  console.log('');
  console.log('  // Import the saveGeoJSON function');
  console.log('  const { saveGeoJSON } = await import("/src/app/actions.ts");');
  console.log('');
  console.log('  // Get current user from auth context');
  console.log('  const auth = getAuth();');
  console.log('  const user = auth.currentUser;');
  console.log('');
  console.log('  if (!user) {');
  console.log('    console.error("Please log in first");');
  console.log('    return;');
  console.log('  }');
  console.log('');
  console.log('  try {');
  console.log('    const result = await saveGeoJSON({');
  console.log('      name: "Cambodia 25 Provinces",');
  console.log('      description: "Complete administrative boundaries for all 25 provinces of Cambodia",');
  console.log('      geoJsonData: geoJsonData');
  console.log('    }, user.uid, user.displayName || "Admin");');
  console.log('');
  console.log('    if (result.success) {');
  console.log('      console.log("✅ Successfully uploaded all 25 provinces!");');
  console.log('      console.log("Province count:", geoJsonData.features.length);');
  console.log('      if (result.warnings) {');
  console.log('        console.warn("⚠️ Warnings:", result.warnings);');
  console.log('      }');
  console.log('      // Refresh the page to load the new boundaries');
  console.log('      window.location.reload();');
  console.log('    } else {');
  console.log('      console.error("❌ Upload failed:", result.error);');
  console.log('    }');
  console.log('  } catch (error) {');
  console.log('    console.error("❌ Upload error:", error);');
  console.log('  }');
  console.log('})();');
  console.log('');
  console.log('After running this code, the page will refresh and load all 25 province boundaries.');
}