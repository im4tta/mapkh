export type AdminLevel = 'province' | 'district' | 'commune';

export const getProvinceDisplayName = (provinceName: string): string => {
  // Province name mapping for display purposes
  const provinceMapping: Record<string, string> = {
    'Banteay Meanchey': 'Banteay Meanchey',
    'Battambang': 'Battambang',
    'Kampong Cham': 'Kampong Cham',
    'Kampong Chhnang': 'Kampong Chhnang',
    'Kampong Speu': 'Kampong Speu',
    'Kampong Thom': 'Kampong Thom',
    'Kampot': 'Kampot',
    'Kandal': 'Kandal',
    'Kep': 'Kep',
    'Koh Kong': 'Koh Kong',
    'Kratie': 'Kratie',
    'Mondulkiri': 'Mondulkiri',
    'Oddar Meanchey': 'Oddar Meanchey',
    'Pailin': 'Pailin',
    'Phnom Penh': 'Phnom Penh',
    'Preah Sihanouk': 'Preah Sihanouk',
    'Preah Vihear': 'Preah Vihear',
    'Prey Veng': 'Prey Veng',
    'Pursat': 'Pursat',
    'Ratanakiri': 'Ratanakiri',
    'Siem Reap': 'Siem Reap',
    'Stung Treng': 'Stung Treng',
    'Svay Rieng': 'Svay Rieng',
    'Takeo': 'Takeo',
    'Tboung Khmum': 'Tboung Khmum'
  };
  
  return provinceMapping[provinceName] || provinceName;
};

export const getAdminLevelLabel = (adminLevel: AdminLevel): string => {
  const labels: Record<AdminLevel, string> = {
    'province': 'Province',
    'district': 'District',
    'commune': 'Commune'
  };
  
  return labels[adminLevel] || adminLevel;
};