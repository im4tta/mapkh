const fs = require('fs');
const { createCanvas } = require('canvas');

// Create PWA icon with square design, rounded corners, Cambodian flag colors, white shield and blue checkmark (JPG format)
function createPWAIconJPG(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Cambodian flag colors
  const cambodianRed = '#DE0000';
  const cambodianBlue = '#032EA1';
  const white = '#FFFFFF';
  
  // PWA icons with rounded corners for modern square design
  const cornerRadius = size * 0.15; // Moderate corner radius for PWA icons
  
  // Create rounded rectangle path for clipping
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();
  ctx.clip();
  
  // Cambodian flag horizontal stripes (blue-red-blue)
  const stripeHeight = size / 3;
  
  // Top blue stripe
  ctx.fillStyle = cambodianBlue;
  ctx.fillRect(0, 0, size, stripeHeight);
  
  // Middle red stripe
  ctx.fillStyle = cambodianRed;
  ctx.fillRect(0, stripeHeight, size, stripeHeight);
  
  // Bottom blue stripe
  ctx.fillStyle = cambodianBlue;
  ctx.fillRect(0, stripeHeight * 2, size, stripeHeight);
  
  // Draw white shield symbol in center
  const centerX = size / 2;
  const centerY = size / 2;
  const shieldSize = size * 0.35; // Slightly larger shield for better visibility
  
  // Create subtle shadow effect for shield
  const shadowOffset = size * 0.006;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.moveTo(centerX + shadowOffset, centerY - shieldSize / 2 + shadowOffset);
  ctx.lineTo(centerX + shieldSize / 2.5 + shadowOffset, centerY - shieldSize / 2 + shadowOffset);
  ctx.lineTo(centerX + shieldSize / 2.5 + shadowOffset, centerY + shieldSize / 6 + shadowOffset);
  ctx.lineTo(centerX + shadowOffset, centerY + shieldSize / 2 + shadowOffset);
  ctx.lineTo(centerX - shieldSize / 2.5 + shadowOffset, centerY + shieldSize / 6 + shadowOffset);
  ctx.lineTo(centerX - shieldSize / 2.5 + shadowOffset, centerY - shieldSize / 2 + shadowOffset);
  ctx.closePath();
  ctx.fill();
  
  // White shield background with subtle gradient for depth
  const shieldGradient = ctx.createLinearGradient(centerX - shieldSize/2.5, centerY - shieldSize/2, centerX + shieldSize/2.5, centerY + shieldSize/2);
  shieldGradient.addColorStop(0, '#FFFFFF');
  shieldGradient.addColorStop(0.5, '#F9F9F9');
  shieldGradient.addColorStop(1, '#F0F0F0');
  
  ctx.fillStyle = shieldGradient;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - shieldSize / 2);
  ctx.lineTo(centerX + shieldSize / 2.5, centerY - shieldSize / 2);
  ctx.lineTo(centerX + shieldSize / 2.5, centerY + shieldSize / 6);
  ctx.lineTo(centerX, centerY + shieldSize / 2);
  ctx.lineTo(centerX - shieldSize / 2.5, centerY + shieldSize / 6);
  ctx.lineTo(centerX - shieldSize / 2.5, centerY - shieldSize / 2);
  ctx.closePath();
  ctx.fill();
  
  // Add subtle border to shield for definition
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = size * 0.003;
  ctx.stroke();
  
  // Draw blue checkmark inside the shield
  ctx.lineWidth = size * 0.022;
  ctx.strokeStyle = cambodianBlue;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Checkmark dimensions
  const checkSize = shieldSize * 0.5;
  
  // Draw checkmark with slight shadow for depth
  ctx.strokeStyle = 'rgba(3, 46, 161, 0.3)';
  ctx.lineWidth = size * 0.024;
  ctx.beginPath();
  ctx.moveTo(centerX - checkSize * 0.25 + shadowOffset/2, centerY + shadowOffset/2);
  ctx.lineTo(centerX - checkSize * 0.05 + shadowOffset/2, centerY + checkSize * 0.15 + shadowOffset/2);
  ctx.lineTo(centerX + checkSize * 0.25 + shadowOffset/2, centerY - checkSize * 0.15 + shadowOffset/2);
  ctx.stroke();
  
  // Main blue checkmark
  ctx.strokeStyle = cambodianBlue;
  ctx.lineWidth = size * 0.022;
  ctx.beginPath();
  ctx.moveTo(centerX - checkSize * 0.25, centerY);
  ctx.lineTo(centerX - checkSize * 0.05, centerY + checkSize * 0.15);
  ctx.lineTo(centerX + checkSize * 0.25, centerY - checkSize * 0.15);
  ctx.stroke();
  
  // Save as JPG with high quality
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  fs.writeFileSync(`public/icons/${filename}`, buffer);
  console.log(`Created icons/${filename} (${size}x${size}) with Khmer flag colors and Guard symbol`);
}

// Create all required PWA icon sizes in JPG format
const sizes = [
  { size: 96, name: 'icon-96x96.jpg' },
  { size: 128, name: 'icon-128x128.jpg' },
  { size: 144, name: 'icon-144x144.jpg' },
  { size: 152, name: 'icon-152x152.jpg' },
  { size: 192, name: 'icon-192x192.jpg' },
  { size: 256, name: 'icon-256x256.jpg' },
  { size: 384, name: 'icon-384x384.jpg' },
  { size: 512, name: 'icon-512x512.jpg' }
];

console.log('Creating new PWA JPG icons...');
sizes.forEach(({ size, name }) => {
  createPWAIconJPG(size, name);
});
console.log('All PWA JPG icons created successfully!');