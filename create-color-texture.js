// Create a simple color texture for testing
const fs = require('fs');
const sharp = require('sharp');

// Create a basic color texture to match our MER sample
async function createColorTexture() {
  try {
    // Create a simple color texture (dark blue with green pattern)
    const width = 256;
    const height = 256;
    const channels = 4; // RGBA
    const data = Buffer.alloc(width * height * channels);
    
    // Fill with dark blue background
    for (let i = 0; i < width * height; i++) {
      const offset = i * channels;
      data[offset] = 0;     // R
      data[offset + 1] = 0; // G
      data[offset + 2] = 100; // B
      data[offset + 3] = 255; // A
    }
    
    // Add some green pattern in the center (similar to command block)
    const centerX = width / 2;
    const centerY = height / 2;
    const patternSize = 80;
    
    for (let y = centerY - patternSize/2; y < centerY + patternSize/2; y++) {
      for (let x = centerX - patternSize/2; x < centerX + patternSize/2; x++) {
        if ((x - centerX + patternSize/4) % (patternSize/3) < patternSize/6 && 
            (y - centerY + patternSize/4) % (patternSize/3) < patternSize/6) {
          const offset = (y * width + x) * channels;
          data[offset] = 0;     // R
          data[offset + 1] = 200; // G
          data[offset + 2] = 0; // B
          data[offset + 3] = 255; // A
        }
      }
    }
    
    // Save the texture
    await sharp(data, {
      raw: {
        width,
        height,
        channels
      }
    }).png().toFile('test/command_block_side.png');
    
    console.log('Color texture created successfully');
  } catch (error) {
    console.error('Error creating color texture:', error);
  }
}

createColorTexture();
