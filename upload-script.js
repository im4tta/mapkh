
// Copy and paste this into your browser console on the map page:
(async function uploadProvinces() {
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
        "coordinates": [
          [
            [
              102.5,
              13.5
            ],
            [
              103.5,
              13.5
            ],
            [
              103.5,
              14.5
            ],
            [
              102.5,
              14.5
            ],
            [
              102.5,
              13.5
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              102.8,
              12.8
            ],
            [
              103.8,
              12.8
            ],
            [
              103.8,
              13.8
            ],
            [
              102.8,
              13.8
            ],
            [
              102.8,
              12.8
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              105.2,
              11.8
            ],
            [
              106.2,
              11.8
            ],
            [
              106.2,
              12.8
            ],
            [
              105.2,
              12.8
            ],
            [
              105.2,
              11.8
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              104.2,
              12
            ],
            [
              105.2,
              12
            ],
            [
              105.2,
              13
            ],
            [
              104.2,
              13
            ],
            [
              104.2,
              12
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              104,
              11
            ],
            [
              105,
              11
            ],
            [
              105,
              12
            ],
            [
              104,
              12
            ],
            [
              104,
              11
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              104.5,
              12.5
            ],
            [
              105.5,
              12.5
            ],
            [
              105.5,
              13.5
            ],
            [
              104.5,
              13.5
            ],
            [
              104.5,
              12.5
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              104,
              10.5
            ],
            [
              105,
              10.5
            ],
            [
              105,
              11.5
            ],
            [
              104,
              11.5
            ],
            [
              104,
              10.5
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              104.8,
              11.2
            ],
            [
              105.8,
              11.2
            ],
            [
              105.8,
              12.2
            ],
            [
              104.8,
              12.2
            ],
            [
              104.8,
              11.2
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.9_1",
        "NAME_1": "Koh Kong",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              102.8,
              10.5
            ],
            [
              103.8,
              10.5
            ],
            [
              103.8,
              11.5
            ],
            [
              102.8,
              11.5
            ],
            [
              102.8,
              10.5
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.10_1",
        "NAME_1": "Kratie",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              105.8,
              12.2
            ],
            [
              106.8,
              12.2
            ],
            [
              106.8,
              13.2
            ],
            [
              105.8,
              13.2
            ],
            [
              105.8,
              12.2
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.11_1",
        "NAME_1": "Mondulkiri",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              106.5,
              11.5
            ],
            [
              107.5,
              11.5
            ],
            [
              107.5,
              12.5
            ],
            [
              106.5,
              12.5
            ],
            [
              106.5,
              11.5
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.12_1",
        "NAME_1": "Phnom Penh",
        "TYPE_1": "Municipality",
        "ENGTYPE_1": "Municipality"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              104.8,
              11.5
            ],
            [
              104.95,
              11.5
            ],
            [
              104.95,
              11.65
            ],
            [
              104.8,
              11.65
            ],
            [
              104.8,
              11.5
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.13_1",
        "NAME_1": "Preah Vihear",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              104.8,
              13.5
            ],
            [
              105.8,
              13.5
            ],
            [
              105.8,
              14.5
            ],
            [
              104.8,
              14.5
            ],
            [
              104.8,
              13.5
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.14_1",
        "NAME_1": "Prey Veng",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              105.5,
              11
            ],
            [
              106.5,
              11
            ],
            [
              106.5,
              12
            ],
            [
              105.5,
              12
            ],
            [
              105.5,
              11
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.15_1",
        "NAME_1": "Pursat",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              103.5,
              12
            ],
            [
              104.5,
              12
            ],
            [
              104.5,
              13
            ],
            [
              103.5,
              13
            ],
            [
              103.5,
              12
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.16_1",
        "NAME_1": "Ratanakiri",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              106.8,
              13.2
            ],
            [
              107.8,
              13.2
            ],
            [
              107.8,
              14.2
            ],
            [
              106.8,
              14.2
            ],
            [
              106.8,
              13.2
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.17_1",
        "NAME_1": "Siem Reap",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              103.5,
              13
            ],
            [
              104.5,
              13
            ],
            [
              104.5,
              14
            ],
            [
              103.5,
              14
            ],
            [
              103.5,
              13
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.18_1",
        "NAME_1": "Preah Sihanouk",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              103.2,
              10.2
            ],
            [
              104.2,
              10.2
            ],
            [
              104.2,
              11.2
            ],
            [
              103.2,
              11.2
            ],
            [
              103.2,
              10.2
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.19_1",
        "NAME_1": "Stung Treng",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              105.8,
              13.2
            ],
            [
              106.8,
              13.2
            ],
            [
              106.8,
              14.2
            ],
            [
              105.8,
              14.2
            ],
            [
              105.8,
              13.2
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.20_1",
        "NAME_1": "Svay Rieng",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              105.8,
              10.8
            ],
            [
              106.8,
              10.8
            ],
            [
              106.8,
              11.8
            ],
            [
              105.8,
              11.8
            ],
            [
              105.8,
              10.8
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.21_1",
        "NAME_1": "Takeo",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              104.5,
              10.5
            ],
            [
              105.5,
              10.5
            ],
            [
              105.5,
              11.5
            ],
            [
              104.5,
              11.5
            ],
            [
              104.5,
              10.5
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.22_1",
        "NAME_1": "Oddar Meanchey",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              103.8,
              13.8
            ],
            [
              104.8,
              13.8
            ],
            [
              104.8,
              14.8
            ],
            [
              103.8,
              14.8
            ],
            [
              103.8,
              13.8
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.23_1",
        "NAME_1": "Kep",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              104.2,
              10.4
            ],
            [
              104.35,
              10.4
            ],
            [
              104.35,
              10.55
            ],
            [
              104.2,
              10.55
            ],
            [
              104.2,
              10.4
            ]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "GID_1": "KHM.24_1",
        "NAME_1": "Pailin",
        "TYPE_1": "Province",
        "ENGTYPE_1": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              102.6,
              12.8
            ],
            [
              102.8,
              12.8
            ],
            [
              102.8,
              13
            ],
            [
              102.6,
              13
            ],
            [
              102.6,
              12.8
            ]
          ]
        ]
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
        "coordinates": [
          [
            [
              105.2,
              12.8
            ],
            [
              106.2,
              12.8
            ],
            [
              106.2,
              13.8
            ],
            [
              105.2,
              13.8
            ],
            [
              105.2,
              12.8
            ]
          ]
        ]
      }
    }
  ]
};
  
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
