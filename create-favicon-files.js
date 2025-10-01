const fs = require('fs');
const path = require('path');

// Khmer flag colors
const RED = '#D6001C';
const BLUE = '#00209F';
const WHITE = '#FFFFFF';

function createFaviconSVG(size) {
  const cornerRadius = Math.round(size * 0.15); // 15% corner radius for rounded square
  const shieldSize = Math.round(size * 0.6); // Shield takes 60% of icon
  const checkSize = Math.round(shieldSize * 0.4); // Check mark is 40% of shield
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flagGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${RED};stop-opacity:1" />
      <stop offset="33.33%" style="stop-color:${RED};stop-opacity:1" />
      <stop offset="33.33%" style="stop-color:${BLUE};stop-opacity:1" />
      <stop offset="66.66%" style="stop-color:${BLUE};stop-opacity:1" />
      <stop offset="66.66%" style="stop-color:${RED};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${RED};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Rounded square background with Khmer flag colors -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#flagGradient)" />
  
  <!-- White shield in center -->
  <g transform="translate(${(size - shieldSize) / 2}, ${(size - shieldSize) / 2})">
    <!-- Shield shape -->
    <path d="M ${shieldSize/2} 0 
             C ${shieldSize * 0.8} 0, ${shieldSize} ${shieldSize * 0.3}, ${shieldSize} ${shieldSize * 0.6}
             C ${shieldSize} ${shieldSize * 0.9}, ${shieldSize/2} ${shieldSize}, ${shieldSize/2} ${shieldSize}
             C ${shieldSize/2} ${shieldSize}, 0 ${shieldSize * 0.9}, 0 ${shieldSize * 0.6}
             C 0 ${shieldSize * 0.3}, ${shieldSize * 0.2} 0, ${shieldSize/2} 0 Z" 
          fill="${WHITE}" stroke="${BLUE}" stroke-width="2"/>
    
    <!-- Blue checkmark inside shield -->
    <g transform="translate(${shieldSize * 0.25}, ${shieldSize * 0.3})">
      <path d="M 0 ${checkSize * 0.5} 
               L ${checkSize * 0.4} ${checkSize * 0.9} 
               L ${checkSize} 0" 
            stroke="${BLUE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
  </g>
</svg>`;
}

function createFaviconFiles() {
  console.log('Creating favicon files...');
  
  try {
    // Create favicon.svg (scalable)
    const faviconSVG = createFaviconSVG(32);
    fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), faviconSVG);
    console.log('✅ Created favicon.svg');
    
    // Create different sized SVG favicons
    const sizes = [16, 32, 48, 64, 96, 128, 192, 256];
    
    for (const size of sizes) {
      const svg = createFaviconSVG(size);
      fs.writeFileSync(path.join(__dirname, 'public', `favicon-${size}x${size}.svg`), svg);
      console.log(`✅ Created favicon-${size}x${size}.svg`);
    }
    
    // Create a simple ICO file content (base64 encoded PNG data)
    // For now, we'll create a simple placeholder that browsers can use
    const simpleICO = faviconSVG;
    fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), simpleICO);
    console.log('✅ Created favicon.ico (as SVG)');
    
    console.log('🎉 All favicon files created successfully!');
    console.log('Note: SVG favicons work in modern browsers. For better ICO support, consider using an online converter.');
    
  } catch (error) {
    console.error('❌ Error creating favicon files:', error);
  }
}

createFaviconFiles();