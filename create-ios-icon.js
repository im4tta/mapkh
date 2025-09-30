const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple, clean icon for iOS testing
function createIOSIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill with solid background (no transparency)
  ctx.fillStyle = '#D6001C'; // Brand red color
  ctx.fillRect(0, 0, size, size);
  
  // Add white "M" letter in center
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size / 2, size / 2);
  
  // Add subtle border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.02;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
  
  // Save as PNG with no transparency
  const buffer = canvas.toBuffer('image/png', { compressionLevel: 6, filters: canvas.PNG_FILTER_NONE });
  fs.writeFileSync(`public/${filename}`, buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

// Create all required iOS icon sizes
const sizes = [
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' }
];

console.log('Creating new iOS-optimized PNG icons...');
sizes.forEach(({ size, name }) => {
  createIOSIcon(size, name);
});
console.log('All iOS icons created successfully!');