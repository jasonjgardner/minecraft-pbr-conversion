# PBR Workflow Converter

A TypeScript Node library for bidirectional conversion between Minecraft Bedrock RTX/RenderDragon PBR textures and LabPBR textures for Minecraft Java Edition shaders.

## Features

- **Bidirectional Conversion**: Convert textures in both directions:
  - Bedrock MER → LabPBR specular/glossy
  - LabPBR specular/glossy → Bedrock MER
- **Automatic Format Detection**: Automatically detect texture format and convert accordingly
- **Normal Map Processing**: Handle normal maps with proper channel reconstruction
- **Heightmap Extraction**: Extract heightmaps from LabPBR normal textures
- **Ambient Occlusion Handling**: Option to bake AO into base color textures
- **Batch Processing**: Convert entire directories of textures at once

## Installation

```bash
npx https://github.com/jasonjgardner/minecraft-pbr-conversion
```

## Usage

### Command Line Interface

The library provides several commands for different conversion scenarios:

#### Convert Bedrock to LabPBR (Original functionality)

```bash
node dist/cli.js convert path/to/texture_mer.png -c path/to/color.png -o output/dir
```

#### Convert LabPBR to Bedrock (New functionality)

```bash
node dist/bidirectional/bidirectionalCli.js convert-to-bedrock path/to/texture_s.png -n path/to/texture_n.png -c path/to/color.png -o output/dir
```

#### Automatic Format Detection and Conversion

```bash
node dist/bidirectional/bidirectionalCli.js convert-auto path/to/any_texture.png -o output/dir
```

#### Convert All Textures in a Directory

```bash
node dist/bidirectional/bidirectionalCli.js convert-dir path/to/textures/dir -o output/dir
```

### Options

- `-o, --output <dir>`: Output directory
- `-f, --format <format>`: Output format (png, jpg, tga)
- `-q, --quality <level>`: Compression level (1-10)
- `-b, --bake-ao`: Bake ambient occlusion into base color texture
- `-e, --extract-height`: Extract heightmap from normal texture
- `-d, --direction <direction>`: Force conversion direction (auto, to-labpbr, to-bedrock)

### Programmatic Usage

```typescript
import { BidirectionalConverter } from './dist';

// Automatic format detection and conversion
const result = await BidirectionalConverter.convertAuto(
  'path/to/texture.png',
  'output/dir',
  {
    bakeAO: true,
    extractHeightMap: true
  }
);

// LabPBR to Bedrock conversion
const result = await BidirectionalConverter.convertLabPBRToBedrock(
  'path/to/texture_s.png',
  'path/to/texture_n.png',
  'path/to/color.png',
  'output/dir',
  {
    bakeAO: true,
    extractHeightMap: true
  }
);
```

## Texture Format Details

### Bedrock MER Format

- **Red Channel**: Metallic map (0-255)
- **Green Channel**: Emissive level map (0-255)
- **Blue Channel**: Roughness map (0-255)
- **Alpha Channel**: Subsurface scattering level (optional)

### LabPBR Format

- **Specular Texture (_s)**:
  - **Red Channel**: Perceptual smoothness (0-255)
  - **Green Channel**: F0/reflectance (0-229) or predefined metals (230-255)
  - **Blue Channel**: Porosity (0-64) or subsurface scattering (65-255)
  - **Alpha Channel**: Emissive level (0-254, 255 is reserved)

- **Normal Texture (_n)**:
  - **Red/Green Channels**: Normal map in DirectX format (Y-)
  - **Blue Channel**: Ambient Occlusion (0 = 100% AO, 255 = 0% AO)
  - **Alpha Channel**: Height map (0 = depth, 255 = height)

## License

GPL

---
[![Made with Manus](https://github.com/user-attachments/assets/7e5abadf-b44d-44b2-b95d-4550598f1c64)](https://manus.im/share/jHAeAUNTk4v0ca0kLXiRwx?replay=1)
