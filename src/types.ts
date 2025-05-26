/**
 * Types for the PBR Workflow Converter
 */

export interface ConversionOptions {
  // Whether to preserve the original textures
  preserveOriginals?: boolean;
  
  // Custom mapping for special materials
  materialMappings?: MaterialMapping[];
  
  // Output format options
  outputFormat?: 'png' | 'tga' | 'jpg';
  
  // Compression level for output textures
  compressionLevel?: number;
  
  // Whether to generate normal maps if missing
  generateNormalMaps?: boolean;
}

export interface MaterialMapping {
  // Pattern to match texture names
  pattern: string | RegExp;
  
  // Custom conversion parameters for matched textures
  parameters: {
    metalFactor?: number;
    roughnessFactor?: number;
    emissiveFactor?: number;
    // Other material-specific parameters
  };
}

export interface ConversionResult {
  // Original texture path
  sourcePath: string;
  
  // Generated texture paths
  outputPaths: {
    specular?: string;
    normal?: string;
  };
  
  // Whether the conversion was successful
  success: boolean;
  
  // Any warnings or information about the conversion
  messages: string[];
}

export interface PackConversionOptions extends ConversionOptions {
  // Whether to recursively process subdirectories
  recursive?: boolean;
  
  // Filter for texture files to process
  fileFilter?: string | RegExp;
}

export interface PackConversionResult {
  // Path to the original pack
  sourcePath: string;
  
  // Path to the output pack
  outputPath: string;
  
  // Results for individual textures
  textureResults: ConversionResult[];
  
  // Overall success status
  success: boolean;
  
  // Summary messages
  summary: string;
}

export interface TextureData {
  // Width of the texture
  width: number;
  
  // Height of the texture
  height: number;
  
  // Raw pixel data
  data: Buffer;
  
  // Number of channels (3 for RGB, 4 for RGBA)
  channels: number;
}

export interface ChannelData {
  // Red channel data
  r: Buffer;
  
  // Green channel data
  g: Buffer;
  
  // Blue channel data
  b: Buffer;
  
  // Alpha channel data (if available)
  a?: Buffer;
  
  // Width of the texture
  width: number;
  
  // Height of the texture
  height: number;
}

// Enum for predefined metals in LabPBR
export enum PredefinedMetal {
  Iron = 230,
  Gold = 231,
  Aluminum = 232,
  Chrome = 233,
  Copper = 234,
  Lead = 235,
  Platinum = 236,
  Silver = 237
}
