const fs = require('fs');
const { createCanvas } = require('canvas');

// Icon sizes needed
const iconSizes = [
  { size: 16, filename: 'favicon-16x16.png' },
  { size: 32, filename: 'favicon-32x32.png' },
  { size: 96, filename: 'favicon-96x96.png' },
  { size: 128, filename: 'icon-128x128.png' },
  { size: 144, filename: 'icon-144x144.png' },
  { size: 152, filename: 'icon-152x152.png' },
  { size: 180, filename: 'apple-touch-icon-180x180.png' },
  { size: 192, filename: 'icon-192x192.png' },
  { size: 256, filename: 'icon-256x256.png' },
  { size: 384, filename: 'icon-384x384.png' },
  { size: 512, filename: 'icon-512x512.png' }
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

// Create all icon sizes
iconSizes.forEach(({ size, filename }) => {
  const iconBuffer = createMapKHIcon(size);
  
  // Determine the correct path
  let filepath;
  if (filename.includes('apple-touch-icon') || filename.includes('favicon') || filename.includes('icon-192') || filename.includes('icon-512')) {
    filepath = `public/${filename}`;
  } else {
    filepath = `public/icons/${filename}`;
  }
  
  fs.writeFileSync(filepath, iconBuffer);
  console.log(`Created ${filepath}`);
});

console.log('All PNG icons created successfully!');