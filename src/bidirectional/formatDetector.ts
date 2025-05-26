/**
 * FormatDetector module for automatically detecting texture formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { TextureLoader } from '../textureLoader';
import { ChannelExtractor } from '../channelExtractor';
import { TextureData } from '../types';

export enum TextureFormat {
  Bedrock,
  LabPBR,
  Unknown
}

export enum ConversionDirection {
  BedrockToLabPBR,
  LabPBRToBedrock,
  Auto
}

export interface DetectionResult {
  format: TextureFormat;
  baseTexturePath?: string;
  merTexturePath?: string;
  specularTexturePath?: string;
  normalTexturePath?: string;
  confidence: number; // 0-1 confidence score
}

export class FormatDetector {
  /**
   * Detect the format of a texture based on file naming, presence, and content
   * @param texturePath Path to any texture file (base, MER, specular, normal)
   * @returns Detection result with format and related texture paths
   */
  public static detectFormat(texturePath: string): DetectionResult {
    const result: DetectionResult = {
      format: TextureFormat.Unknown,
      confidence: 0
    };
    
    const dir = path.dirname(texturePath);
    const fileName = path.basename(texturePath);
    const baseName = path.basename(texturePath, path.extname(texturePath));
    
    // Check file naming patterns
    const isLabPBRSpecular = baseName.endsWith('_s');
    const isLabPBRNormal = baseName.endsWith('_n');
    const isBedrockMER = baseName.endsWith('_mer');
    
    // Base name without suffixes
    let baseNameWithoutSuffix = baseName;
    if (isLabPBRSpecular) {
      baseNameWithoutSuffix = baseName.slice(0, -2);
    } else if (isLabPBRNormal) {
      baseNameWithoutSuffix = baseName.slice(0, -2);
    } else if (isBedrockMER) {
      baseNameWithoutSuffix = baseName.slice(0, -4);
    }
    
    // Check for presence of related files
    const baseTexturePath = path.join(dir, `${baseNameWithoutSuffix}${path.extname(texturePath)}`);
    const specularTexturePath = path.join(dir, `${baseNameWithoutSuffix}_s${path.extname(texturePath)}`);
    const normalTexturePath = path.join(dir, `${baseNameWithoutSuffix}_n${path.extname(texturePath)}`);
    const merTexturePath = path.join(dir, `${baseNameWithoutSuffix}_mer${path.extname(texturePath)}`);
    
    const hasBaseTexture = fs.existsSync(baseTexturePath);
    const hasSpecularTexture = fs.existsSync(specularTexturePath);
    const hasNormalTexture = fs.existsSync(normalTexturePath);
    const hasMERTexture = fs.existsSync(merTexturePath);
    
    // Calculate confidence scores
    let labPBRConfidence = 0;
    let bedrockConfidence = 0;
    
    // File naming confidence
    if (isLabPBRSpecular || isLabPBRNormal) {
      labPBRConfidence += 0.4;
    }
    if (isBedrockMER) {
      bedrockConfidence += 0.4;
    }
    
    // File presence confidence
    if (hasSpecularTexture && hasNormalTexture) {
      labPBRConfidence += 0.3;
    }
    if (hasMERTexture) {
      bedrockConfidence += 0.3;
    }
    
    // Base texture presence (both formats should have this)
    if (hasBaseTexture) {
      labPBRConfidence += 0.1;
      bedrockConfidence += 0.1;
    }
    
    // Determine format based on confidence
    if (labPBRConfidence > bedrockConfidence) {
      result.format = TextureFormat.LabPBR;
      result.confidence = labPBRConfidence;
      
      if (hasBaseTexture) result.baseTexturePath = baseTexturePath;
      if (hasSpecularTexture) result.specularTexturePath = specularTexturePath;
      if (hasNormalTexture) result.normalTexturePath = normalTexturePath;
    } else if (bedrockConfidence > 0) {
      result.format = TextureFormat.Bedrock;
      result.confidence = bedrockConfidence;
      
      if (hasBaseTexture) result.baseTexturePath = baseTexturePath;
      if (hasMERTexture) result.merTexturePath = merTexturePath;
    }
    
    return result;
  }
  
  /**
   * Detect formats for all textures in a directory
   * @param directoryPath Directory to scan for textures
   * @returns Map of base names to detection results
   */
  public static detectFormatInDirectory(directoryPath: string): Map<string, DetectionResult> {
    const results = new Map<string, DetectionResult>();
    
    if (!fs.existsSync(directoryPath)) {
      return results;
    }
    
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
      if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.tga')) {
        continue;
      }
      
      const filePath = path.join(directoryPath, file);
      const result = this.detectFormat(filePath);
      
      // Use base name without suffix as key
      const baseName = path.basename(file, path.extname(file))
        .replace('_s', '')
        .replace('_n', '')
        .replace('_mer', '');
      
      // Only add if we have a confident result
      if (result.confidence > 0.3) {
        results.set(baseName, result);
      }
    }
    
    return results;
  }
  
  /**
   * Analyze texture content to determine format
   * This is a more expensive operation but can help in ambiguous cases
   * @param textureData Texture data to analyze
   * @returns Detected texture format
   */
  public static analyzeTextureContent(textureData: TextureData): TextureFormat {
    // Extract channels
    const channels = ChannelExtractor.extractChannels(textureData);
    
    // Calculate average values for each channel
    const pixelCount = channels.width * channels.height;
    let rSum = 0, gSum = 0, bSum = 0;
    
    for (let i = 0; i < pixelCount; i++) {
      rSum += channels.r[i];
      gSum += channels.g[i];
      bSum += channels.b[i];
    }
    
    const rAvg = rSum / pixelCount;
    const gAvg = gSum / pixelCount;
    const bAvg = bSum / pixelCount;
    
    // Check for LabPBR specular characteristics
    // LabPBR specular typically has high red values (smoothness)
    if (rAvg > 150 && gAvg < 100) {
      return TextureFormat.LabPBR;
    }
    
    // Check for Bedrock MER characteristics
    // MER typically has high red values only in metallic areas
    // and generally higher blue values (roughness)
    if (bAvg > 150 && rAvg < 100) {
      return TextureFormat.Bedrock;
    }
    
    // If we can't determine from averages, check for normal map characteristics
    // Normal maps typically have a lot of blue (128 is neutral)
    if (Math.abs(bAvg - 128) < 30 && Math.abs(rAvg - 128) < 30 && Math.abs(gAvg - 128) < 30) {
      // This is likely a normal map, but we can't determine format from this alone
      return TextureFormat.Unknown;
    }
    
    return TextureFormat.Unknown;
  }
  
  /**
   * Determine the appropriate conversion direction based on a texture path
   * @param texturePath Path to any texture file
   * @returns Conversion direction
   */
  public static determineConversionDirection(texturePath: string): ConversionDirection {
    const result = this.detectFormat(texturePath);
    
    if (result.format === TextureFormat.Bedrock) {
      return ConversionDirection.BedrockToLabPBR;
    } else if (result.format === TextureFormat.LabPBR) {
      return ConversionDirection.LabPBRToBedrock;
    }
    
    return ConversionDirection.Auto;
  }
}
