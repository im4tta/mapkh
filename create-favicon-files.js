const fs = require('fs');

// Cambodian flag colors (matching existing design)
const cambodianRed = '#DE0000';
const cambodianBlue = '#032EA1';
const white = '#FFFFFF';

// Create SVG favicon that matches existing icon design
function createSVGFavicon(size, filename) {
  // Calculate proportional values
  const stripeHeight = size / 3;
  const cornerRadius = size * 0.15; // Rounded corners like existing design
  const shieldSize = size * 0.3;
  const centerX = size / 2;
  const centerY = size / 2;
  const checkSize = shieldSize * 0.45;
  
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Rounded rectangle mask for iOS-style corners -->
    <clipPath id="roundedCorners">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
    </clipPath>
    
    <!-- Gradient for 3D shield effect -->
    <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#F8F8F8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E8E8E8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Apply rounded corners -->
  <g clip-path="url(#roundedCorners)">
    <!-- Cambodian flag horizontal stripes (blue-red-blue) -->
    <!-- Top blue stripe -->
    <rect x="0" y="0" width="${size}" height="${stripeHeight}" fill="${cambodianBlue}"/>
    
    <!-- Middle red stripe -->
    <rect x="0" y="${stripeHeight}" width="${size}" height="${stripeHeight}" fill="${cambodianRed}"/>
    
    <!-- Bottom blue stripe -->
    <rect x="0" y="${stripeHeight * 2}" width="${size}" height="${stripeHeight}" fill="${cambodianBlue}"/>
    
    <!-- Shield shadow for 3D effect -->
    <path d="M ${centerX + 2} ${centerY - shieldSize/2 + 2} 
             L ${centerX + shieldSize/3 + 2} ${centerY - shieldSize/2 + 2} 
             L ${centerX + shieldSize/3 + 2} ${centerY + shieldSize/6 + 2} 
             L ${centerX + 2} ${centerY + shieldSize/2 + 2} 
             L ${centerX - shieldSize/3 + 2} ${centerY + shieldSize/6 + 2} 
             L ${centerX - shieldSize/3 + 2} ${centerY - shieldSize/2 + 2} Z" 
          fill="rgba(0,0,0,0.3)"/>
    
    <!-- White shield with gradient -->
    <path d="M ${centerX} ${centerY - shieldSize/2} 
             L ${centerX + shieldSize/3} ${centerY - shieldSize/2} 
             L ${centerX + shieldSize/3} ${centerY + shieldSize/6} 
             L ${centerX} ${centerY + shieldSize/2} 
             L ${centerX - shieldSize/3} ${centerY + shieldSize/6} 
             L ${centerX - shieldSize/3} ${centerY - shieldSize/2} Z" 
          fill="url(#shieldGradient)" 
          stroke="#CCCCCC" 
          stroke-width="1"/>
    
    <!-- Blue checkmark inside shield -->
    <g stroke="${cambodianBlue}" stroke-width="${size * 0.018}" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Checkmark shadow -->
      <path d="M ${centerX - checkSize/3 + 1} ${centerY + 1} 
               L ${centerX - checkSize/6 + 1} ${centerY + checkSize/4 + 1} 
               L ${centerX + checkSize/3 + 1} ${centerY - checkSize/4 + 1}" 
            stroke="rgba(0,0,0,0.2)"/>
      
      <!-- Main checkmark -->
      <path d="M ${centerX - checkSize/3} ${centerY} 
               L ${centerX - checkSize/6} ${centerY + checkSize/4} 
               L ${centerX + checkSize/3} ${centerY - checkSize/4}"/>
    </g>
  </g>
</svg>`;

  fs.writeFileSync(`public/${filename}`, svg);
  console.log(`Created public/${filename}`);
}

// Create all required favicon sizes
const faviconSizes = [
  { size: 16, filename: 'favicon-16x16.svg' },
  { size: 32, filename: 'favicon-32x32.svg' },
  { size: 48, filename: 'favicon-48x48.svg' },
  { size: 64, filename: 'favicon-64x64.svg' },
  { size: 96, filename: 'favicon-96x96.svg' },
  { size: 128, filename: 'favicon-128x128.svg' },
  { size: 192, filename: 'favicon-192x192.svg' },
  { size: 256, filename: 'favicon-256x256.svg' }
];

// Create main favicon.svg (32x32 as default)
createSVGFavicon(32, 'favicon.svg');

// Create all favicon sizes
console.log('Creating SVG favicon files that match existing icon design...');
faviconSizes.forEach(({ size, filename }) => {
  createSVGFavicon(size, filename);
});

console.log('All SVG favicon files created successfully with correct Cambodian flag design!');