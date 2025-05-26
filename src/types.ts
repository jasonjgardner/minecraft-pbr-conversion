/**
 * Updated types for bidirectional conversion support
 */

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

export interface TextureData {
  width: number;
  height: number;
  data: Buffer;
  channels: number;
}

export interface ChannelData {
  r: Buffer;
  g: Buffer;
  b: Buffer;
  a?: Buffer;
  width: number;
  height: number;
}

export interface MaterialMapping {
  name: string;
  metallic: number;
  smoothness: number;
  f0: number;
  emissive: number;
}

export interface ConversionOptions {
  preserveOriginals?: boolean;
  materialMappings?: MaterialMapping[];
  outputFormat?: 'png' | 'jpg' | 'tga';
  compressionLevel?: number;
  generateNormalMaps?: boolean;
}

export interface ConversionResult {
  sourcePath: string;
  outputPaths: {
    specular?: string;
    normal?: string;
    mer?: string;
    bedrockNormal?: string;
    heightMap?: string;
    baseColorWithAO?: string;
  };
  success: boolean;
  messages: string[];
  conversionDirection?: number; // Added for bidirectional support
}
