# PBR Workflow Converter

A TypeScript Node library to convert Minecraft Bedrock's metallic/roughness PBR workflow textures into LabPBR's specular/glossy workflow textures for Minecraft Java Edition shaders.

## Features

- Converts Bedrock RTX/RenderDragon MER textures to LabPBR format
- Handles channel mapping according to both specifications
- Supports both individual texture conversion and batch processing
- Command-line interface for easy usage
- Modular architecture for extensibility

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pbr-converter.git

# Navigate to the project directory
cd pbr-converter

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Command Line Interface

The library includes a CLI for easy conversion of textures:

```bash
# Convert a single MER texture
node dist/cli.js convert path/to/texture_mer.png

# Convert a single MER texture with explicit color texture
node dist/cli.js convert path/to/texture_mer.png -c path/to/texture.png

# Convert a single MER texture with custom output directory
node dist/cli.js convert path/to/texture_mer.png -o path/to/output

# Convert all MER textures in a directory
node dist/cli.js convert-dir path/to/textures

# Convert all MER textures in a directory and subdirectories
node dist/cli.js convert-dir path/to/textures -r
```

### Programmatic Usage

You can also use the library programmatically in your own projects:

```typescript
import { PBRConverter } from 'pbr-converter';

async function convertTexture() {
  try {
    const result = await PBRConverter.convertTexture(
      'path/to/texture_mer.png',
      'path/to/texture.png',
      'path/to/output',
      {
        outputFormat: 'png',
        compressionLevel: 8
      }
    );
    
    if (result.success) {
      console.log('Conversion successful!');
      console.log('Output files:', result.outputPaths);
    } else {
      console.error('Conversion failed:', result.messages);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

convertTexture();
```

## Texture Format Details

### Bedrock MER Format

In Bedrock's MER textures:
- Red channel: Metallic map (0-255)
- Green channel: Emissive level map (0-255)
- Blue channel: Roughness map (0-255)
- Alpha channel: Subsurface scattering level (optional)

### LabPBR Format

In LabPBR's specular textures:
- Red channel: Perceptual smoothness (0-255)
- Green channel: F0/reflectance (0-229) or predefined metals (230-255)
- Blue channel: Porosity (0-64) or subsurface scattering (65-255)
- Alpha channel: Emissive level (0-254, 255 is reserved)

## Conversion Process

The library performs the following conversions:
1. Roughness to smoothness: `smoothness = 1.0 - sqrt(roughness)`
2. Metallic to F0/reflectance or predefined metal values
3. Subsurface scattering mapping to LabPBR's blue channel format
4. Emissive level mapping to LabPBR's alpha channel format

## License

MIT
