// Script to upload the complete Cambodia provinces GeoJSON to the database
const fs = require('fs');
const path = require('path');

// Read the complete provinces GeoJSON file
const geoJsonPath = path.join(__dirname, 'src', 'data', 'cambodia-provinces.json');
const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));

console.log('Cambodia Provinces GeoJSON Data:');
console.log('- Total provinces:', geoJsonData.features.length);
console.log('- Province names:');
geoJsonData.features.forEach((feature, index) => {
  console.log(`  ${index + 1}. ${feature.properties.NAME_1}`);
});

console.log('\nTo upload this data to the database:');
console.log('1. Go to the map page in your application');
console.log('2. Click the Upload button');
console.log('3. Select the cambodia-provinces.json file from src/data/');
console.log('4. The system will automatically upload all 25 provinces to the database');
console.log('\nAlternatively, you can use the browser console to upload programmatically.');

// Generate browser console script
const uploadScript = `
// Copy and paste this into your browser console on the map page:
(async function uploadProvinces() {
  const geoJsonData = ${JSON.stringify(geoJsonData, null, 2)};
  
  // Assuming you have access to the saveGeoJSON function and user data
  if (typeof saveGeoJSON !== 'undefined' && window.user) {
    try {
      const result = await saveGeoJSON({
        name: 'Cambodia 25 Provinces',
        description: 'Complete administrative boundaries for all 25 provinces of Cambodia',
        geoJsonData: geoJsonData
      }, window.user.uid, window.user.displayName);
      
      if (result.success) {
        console.log('✅ Successfully uploaded all 25 provinces to database!');
        console.log('Province count:', geoJsonData.features.length);
        if (result.warnings) {
          console.warn('⚠️ Warnings:', result.warnings);
        }
      } else {
        console.error('❌ Upload failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
    }
  } else {
    console.error('❌ saveGeoJSON function or user data not available');
    console.log('Make sure you are on the map page and logged in');
  }
})();
`;

fs.writeFileSync(path.join(__dirname, 'upload-script.js'), uploadScript);
console.log('\n📝 Browser upload script saved to upload-script.js');
console.log('You can copy the contents of that file and paste into browser console.');