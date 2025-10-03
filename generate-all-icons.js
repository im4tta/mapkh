const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Source icon path
const sourceIcon = path.join(__dirname, 'public', 'icons', 'icon-512x512.png');
const publicDir = path.join(__dirname, 'public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Define all required icon sizes and their destinations
const iconConfigs = [
  // PWA Icons (in /public/icons/)
  { size: 128, filename: 'icon-128x128.png', dir: iconsDir },
  { size: 144, filename: 'icon-144x144.png', dir: iconsDir },
  { size: 152, filename: 'icon-152x152.png', dir: iconsDir },
  { size: 192, filename: 'icon-192x192.png', dir: iconsDir },
  { size: 256, filename: 'icon-256x256.png', dir: iconsDir },
  { size: 384, filename: 'icon-384x384.png', dir: iconsDir },
  { size: 512, filename: 'icon-512x512.png', dir: iconsDir },
  
  // Root level icons for manifest.json
  { size: 36, filename: 'icon-36x36.png', dir: publicDir },
  { size: 48, filename: 'icon-48x48.png', dir: publicDir },
  { size: 72, filename: 'icon-72x72.png', dir: publicDir },
  { size: 192, filename: 'icon-192x192.png', dir: publicDir },
  { size: 512, filename: 'icon-512x512.png', dir: publicDir },
  
  // Favicon sizes
  { size: 16, filename: 'favicon-16x16.png', dir: publicDir },
  { size: 32, filename: 'favicon-32x32.png', dir: publicDir },
  { size: 96, filename: 'favicon-96x96.png', dir: publicDir },
  
  // Apple Touch Icons
  { size: 57, filename: 'apple-touch-icon-57x57.png', dir: publicDir },
  { size: 60, filename: 'apple-touch-icon-60x60.png', dir: publicDir },
  { size: 72, filename: 'apple-touch-icon-72x72.png', dir: publicDir },
  { size: 76, filename: 'apple-touch-icon-76x76.png', dir: publicDir },
  { size: 114, filename: 'apple-touch-icon-114x114.png', dir: publicDir },
  { size: 120, filename: 'apple-touch-icon-120x120.png', dir: publicDir },
  { size: 152, filename: 'apple-touch-icon-152x152.png', dir: publicDir },
  { size: 167, filename: 'apple-touch-icon-167x167.png', dir: publicDir },
  { size: 180, filename: 'apple-touch-icon-180x180.png', dir: publicDir },
  { size: 180, filename: 'apple-touch-icon.png', dir: publicDir }, // Default apple touch icon
];

// SVG icon configurations for notifications
const svgIconConfigs = [
  { size: 192, filename: 'icon-192x192.svg', dir: iconsDir },
  { size: 96, filename: 'icon-96x96.svg', dir: iconsDir },
  { size: 512, filename: 'icon-512x512.svg', dir: iconsDir },
  { size: 32, filename: 'favicon.svg', dir: publicDir },
  { size: 16, filename: 'favicon-16x16.svg', dir: publicDir },
  { size: 32, filename: 'favicon-32x32.svg', dir: publicDir },
  { size: 48, filename: 'favicon-48x48.svg', dir: publicDir },
  { size: 96, filename: 'favicon-96x96.svg', dir: publicDir },
  { size: 192, filename: 'favicon-192x192.svg', dir: publicDir },
];

// Function to create PNG icons using Canvas
async function createPngIcon(size, outputPath) {
  try {
    // Load the source image
    const sourceImage = await loadImage(sourceIcon);
    
    // Create canvas with the target size
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Draw the image scaled to fit the canvas
    ctx.drawImage(sourceImage, 0, 0, size, size);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✓ Created ${path.basename(outputPath)} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to create ${path.basename(outputPath)}:`, error.message);
  }
}

// Function to create SVG icons
async function createSvgIcon(size, outputPath) {
  try {
    // Load the source image and convert to base64
    const sourceImage = await loadImage(sourceIcon);
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and draw image
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(sourceImage, 0, 0, size, size);
    
    // Convert to base64
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <image width="${size}" height="${size}" xlink:href="data:image/png;base64,${base64}"/>
</svg>`;
    
    fs.writeFileSync(outputPath, svgContent);
    console.log(`✓ Created ${path.basename(outputPath)} (${size}x${size} SVG)`);
  } catch (error) {
    console.error(`✗ Failed to create ${path.basename(outputPath)}:`, error.message);
  }
}

// Function to create ICO favicon
async function createIcoFavicon() {
  try {
    const icoPath = path.join(publicDir, 'favicon.ico');
    
    // Create a 32x32 PNG for the ICO (Canvas doesn't support ICO directly)
    const sourceImage = await loadImage(sourceIcon);
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(sourceImage, 0, 0, 32, 32);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(icoPath, buffer);
    
    console.log(`✓ Created favicon.ico (32x32)`);
  } catch (error) {
    console.error(`✗ Failed to create favicon.ico:`, error.message);
  }
}

// Main function to generate all icons
async function generateAllIcons() {
  console.log('🚀 Starting icon generation from:', sourceIcon);
  console.log('');
  
  // Check if source file exists
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Source icon not found:', sourceIcon);
    process.exit(1);
  }
  
  console.log('📱 Generating PNG icons...');
  
  // Generate all PNG icons
  for (const config of iconConfigs) {
    const outputPath = path.join(config.dir, config.filename);
    await createPngIcon(config.size, outputPath);
  }
  
  console.log('');
  console.log('🎨 Generating SVG icons...');
  
  // Generate all SVG icons
  for (const config of svgIconConfigs) {
    const outputPath = path.join(config.dir, config.filename);
    await createSvgIcon(config.size, outputPath);
  }
  
  console.log('');
  console.log('🔖 Generating ICO favicon...');
  
  // Generate ICO favicon
  await createIcoFavicon();
  
  console.log('');
  console.log('✅ All icons generated successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   • ${iconConfigs.length} PNG icons created`);
  console.log(`   • ${svgIconConfigs.length} SVG icons created`);
  console.log(`   • 1 ICO favicon created`);
  console.log(`   • Total: ${iconConfigs.length + svgIconConfigs.length + 1} files`);
}

// Run the script
if (require.main === module) {
  generateAllIcons().catch(console.error);
}

module.exports = { generateAllIcons };