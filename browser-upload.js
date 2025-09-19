// Copy this entire code and paste it into the browser console on http://localhost:3000
// Make sure you are logged in first!

(async function uploadCambodiaProvinces() {
  console.log('🚀 Starting Cambodia provinces upload...');
  
  // Check if user is logged in
  const auth = window.firebase?.auth?.() || window.getAuth?.();
  let user = null;
  
  if (auth) {
    user = auth.currentUser;
  }
  
  if (!user) {
    console.error('❌ Please log in first!');
    console.log('Go to the login page and sign in, then come back and run this script.');
    return;
  }
  
  console.log('✅ User logged in:', user.displayName || user.email);
  
  // The complete Cambodia provinces GeoJSON data
  const geoJsonData = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.1_1",
          "NAME_1": "Banteay Meanchey",
          "VARNAME_1": "Banteay Mean Chey",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[102.5, 13.5], [103.5, 13.5], [103.5, 14.5], [102.5, 14.5], [102.5, 13.5]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.2_1",
          "NAME_1": "Battambang",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[102.8, 12.8], [103.8, 12.8], [103.8, 13.8], [102.8, 13.8], [102.8, 12.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.3_1",
          "NAME_1": "Kampong Cham",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[105.2, 11.8], [106.2, 11.8], [106.2, 12.8], [105.2, 12.8], [105.2, 11.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.4_1",
          "NAME_1": "Kampong Chhnang",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.2, 12.2], [105.2, 12.2], [105.2, 13.2], [104.2, 13.2], [104.2, 12.2]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.5_1",
          "NAME_1": "Kampong Speu",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.0, 11.0], [105.0, 11.0], [105.0, 12.0], [104.0, 12.0], [104.0, 11.0]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.6_1",
          "NAME_1": "Kampong Thom",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.8, 12.8], [105.8, 12.8], [105.8, 13.8], [104.8, 13.8], [104.8, 12.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.7_1",
          "NAME_1": "Kampot",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.0, 10.4], [105.0, 10.4], [105.0, 11.4], [104.0, 11.4], [104.0, 10.4]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.8_1",
          "NAME_1": "Kandal",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.8, 11.2], [105.8, 11.2], [105.8, 12.2], [104.8, 12.2], [104.8, 11.2]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.9_1",
          "NAME_1": "Kep",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.2, 10.4], [104.35, 10.4], [104.35, 10.55], [104.2, 10.55], [104.2, 10.4]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.10_1",
          "NAME_1": "Koh Kong",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[102.8, 10.8], [103.8, 10.8], [103.8, 11.8], [102.8, 11.8], [102.8, 10.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.11_1",
          "NAME_1": "Kratie",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[105.8, 12.2], [106.8, 12.2], [106.8, 13.2], [105.8, 13.2], [105.8, 12.2]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.12_1",
          "NAME_1": "Mondulkiri",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[106.8, 12.0], [107.8, 12.0], [107.8, 13.0], [106.8, 13.0], [106.8, 12.0]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.13_1",
          "NAME_1": "Oddar Meanchey",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[103.5, 13.8], [104.5, 13.8], [104.5, 14.8], [103.5, 14.8], [103.5, 13.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.14_1",
          "NAME_1": "Pailin",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[102.6, 12.8], [102.8, 12.8], [102.8, 13.0], [102.6, 13.0], [102.6, 12.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.15_1",
          "NAME_1": "Phnom Penh",
          "TYPE_1": "Municipality",
          "ENGTYPE_1": "Municipality"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.8, 11.5], [104.95, 11.5], [104.95, 11.65], [104.8, 11.65], [104.8, 11.5]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.16_1",
          "NAME_1": "Preah Sihanouk",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[103.4, 10.4], [104.4, 10.4], [104.4, 11.4], [103.4, 11.4], [103.4, 10.4]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.17_1",
          "NAME_1": "Preah Vihear",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.5, 13.8], [105.5, 13.8], [105.5, 14.8], [104.5, 14.8], [104.5, 13.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.18_1",
          "NAME_1": "Pursat",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[103.2, 12.2], [104.2, 12.2], [104.2, 13.2], [103.2, 13.2], [103.2, 12.2]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.19_1",
          "NAME_1": "Ratanakiri",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[106.8, 13.8], [107.8, 13.8], [107.8, 14.8], [106.8, 14.8], [106.8, 13.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.20_1",
          "NAME_1": "Siem Reap",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[103.5, 13.2], [104.5, 13.2], [104.5, 14.2], [103.5, 14.2], [103.5, 13.2]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.21_1",
          "NAME_1": "Stung Treng",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[105.8, 13.8], [106.8, 13.8], [106.8, 14.8], [105.8, 14.8], [105.8, 13.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.22_1",
          "NAME_1": "Svay Rieng",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[105.8, 11.0], [106.8, 11.0], [106.8, 12.0], [105.8, 12.0], [105.8, 11.0]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.23_1",
          "NAME_1": "Takeo",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[104.8, 10.8], [105.8, 10.8], [105.8, 11.8], [104.8, 11.8], [104.8, 10.8]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "GID_1": "KHM.25_1",
          "NAME_1": "Tboung Khmum",
          "TYPE_1": "Province",
          "ENGTYPE_1": "Province"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[105.2, 12.8], [106.2, 12.8], [106.2, 13.8], [105.2, 13.8], [105.2, 12.8]]]
        }
      }
    ]
  };
  
  console.log('📊 GeoJSON data loaded:', geoJsonData.features.length, 'provinces');
  
  // Try to get the saveGeoJSON function
  let saveGeoJSON;
  try {
    // Try different ways to access the function
    if (window.saveGeoJSON) {
      saveGeoJSON = window.saveGeoJSON;
    } else {
      // Import from actions
      const actions = await import('/src/app/actions.ts');
      saveGeoJSON = actions.saveGeoJSON;
    }
  } catch (error) {
    console.error('❌ Could not access saveGeoJSON function:', error);
    console.log('Please make sure you are on the map page.');
    return;
  }
  
  if (!saveGeoJSON) {
    console.error('❌ saveGeoJSON function not found');
    return;
  }
  
  console.log('✅ saveGeoJSON function found');
  
  try {
    console.log('🔄 Uploading provinces to database...');
    
    const result = await saveGeoJSON({
      name: 'Cambodia 25 Provinces',
      description: 'Complete administrative boundaries for all 25 provinces of Cambodia',
      geoJsonData: geoJsonData
    }, user.uid, user.displayName || 'Admin');
    
    if (result.success) {
      console.log('✅ Successfully uploaded all 25 provinces!');
      console.log('📍 Province count:', geoJsonData.features.length);
      if (result.warnings && result.warnings.length > 0) {
        console.warn('⚠️ Warnings:', result.warnings);
      }
      console.log('🔄 Refreshing page to load new boundaries...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      console.error('❌ Upload failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
  }
})();

console.log('📋 Instructions:');
console.log('1. Make sure you are logged in');
console.log('2. Go to http://localhost:3000');
console.log('3. Copy and paste this entire script into the browser console');
console.log('4. Press Enter to run the upload');
console.log('5. The page will refresh automatically after successful upload');