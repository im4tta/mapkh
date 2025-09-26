const fs = require('fs');
const { createCanvas } = require('canvas');

// Missing icon sizes
const iconSizes = [
  { size: 48, filename: 'favicon-48x48.png' },
  { size: 72, filename: 'favicon-72x72.png' }
];

function createMapKHIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Blue background with rounded corners
  const cornerRadius = size * 0.16; // 16% corner radius
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, cornerRadius);
  ctx.fill();
  
  // Map pin icon
  const pinSize = size * 0.25;
  const pinX = size * 0.5;
  const pinY = size * 0.35;
  
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(pinX, pinY, pinSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Pin dot
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(pinX, pinY, pinSize * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // KH text
  const fontSize = size * 0.2;
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KH', pinX, size * 0.75);
  
  return canvas.toBuffer('image/png');
}

// Create missing icon sizes
iconSizes.forEach(({ size, filename }) => {
  const iconBuffer = createMapKHIcon(size);
  const filepath = `public/${filename}`;
  
  fs.writeFileSync(filepath, iconBuffer);
  console.log(`Created ${filepath}`);
});

console.log('Missing PNG icons created successfully!');