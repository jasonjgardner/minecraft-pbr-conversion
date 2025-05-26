/**
 * BidirectionalConverter module for handling conversion in both directions
 */

import * as path from 'path';
import { TextureLoader } from '../textureLoader';
import { ChannelExtractor } from '../channelExtractor';
import { TextureWriter } from '../textureWriter';
import { ConversionOptions, ConversionResult, TextureData } from '../types';
import { FormatDetector, ConversionDirection, TextureFormat } from './formatDetector';
import { BidirectionalWorkflowConverter } from './bidirectionalWorkflowConverter';
import { NormalMapProcessor } from './normalMapProcessor';

export interface BidirectionalConversionOptions extends ConversionOptions {
  conversionDirection?: ConversionDirection;
  bakeAO?: boolean; // Whether to bake AO into base color
  extractHeightMap?: boolean; // Whether to extract height map from normal map
  heightMapIntensity?: number; // Intensity factor for height map extraction
}

export class BidirectionalConverter {
  /**
   * Automatically detect format and convert textures in the appropriate direction
   * @param texturePath Path to any texture file (base, MER, specular, normal)
   * @param outputDir Output directory (optional, defaults to same directory as input)
   * @param options Conversion options
   * @returns Promise resolving to conversion result
   */
  public static async convertAuto(
    texturePath: string,
    outputDir?: string,
    options: BidirectionalConversionOptions = {}
  ): Promise<ConversionResult> {
    // Detect format and determine conversion direction
    const detectionResult = FormatDetector.detectFormat(texturePath);
    const direction = options.conversionDirection || 
      (detectionResult.format === TextureFormat.Bedrock 
        ? ConversionDirection.BedrockToLabPBR 
        : ConversionDirection.LabPBRToBedrock);
    
    // Create result object
    const result: ConversionResult = {
      sourcePath: texturePath,
      outputPaths: {},
      conversionDirection: direction,
      success: false,
      messages: [`Detected format: ${TextureFormat[detectionResult.format]} (confidence: ${detectionResult.confidence.toFixed(2)})`]
    };
    
    try {
      // Perform conversion based on detected direction
      if (direction === ConversionDirection.BedrockToLabPBR) {
        // Use existing Bedrock to LabPBR conversion
        result.messages.push('Converting from Bedrock to LabPBR format...');
        
        // Find MER texture if not provided
        const merTexturePath = detectionResult.merTexturePath || texturePath;
        const colorTexturePath = detectionResult.baseTexturePath;
        
        if (!merTexturePath || !colorTexturePath) {
          throw new Error('Could not find required textures for Bedrock to LabPBR conversion');
        }
        
        // Use the existing PBR converter for this direction
        const { PBRConverter } = require('../pbrConverter');
        const conversionResult = await PBRConverter.convertTexture(
          merTexturePath,
          colorTexturePath,
          outputDir,
          options
        );
        
        // Copy results
        result.success = conversionResult.success;
        result.messages = result.messages.concat(conversionResult.messages);
        result.outputPaths = conversionResult.outputPaths;
        
      } else if (direction === ConversionDirection.LabPBRToBedrock) {
        // Perform LabPBR to Bedrock conversion
        result.messages.push('Converting from LabPBR to Bedrock format...');
        
        // Find required textures
        const specularTexturePath = detectionResult.specularTexturePath || texturePath;
        const normalTexturePath = detectionResult.normalTexturePath;
        const baseTexturePath = detectionResult.baseTexturePath;
        
        if (!specularTexturePath || !normalTexturePath || !baseTexturePath) {
          throw new Error('Could not find required textures for LabPBR to Bedrock conversion');
        }
        
        // Perform the conversion
        const labPBRToBedrock = await this.convertLabPBRToBedrock(
          specularTexturePath,
          normalTexturePath,
          baseTexturePath,
          outputDir,
          options
        );
        
        // Copy results
        result.success = labPBRToBedrock.success;
        result.messages = result.messages.concat(labPBRToBedrock.messages);
        result.outputPaths = labPBRToBedrock.outputPaths;
      } else {
        throw new Error('Could not determine conversion direction');
      }
      
      return result;
    } catch (error) {
      result.messages.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  
  /**
   * Convert LabPBR textures to Bedrock format
   * @param specularTexturePath Path to the LabPBR specular texture
   * @param normalTexturePath Path to the LabPBR normal texture
   * @param baseTexturePath Path to the base color texture
   * @param outputDir Output directory (optional, defaults to same directory as input)
   * @param options Conversion options
   * @returns Promise resolving to conversion result
   */
  public static async convertLabPBRToBedrock(
    specularTexturePath: string,
    normalTexturePath: string,
    baseTexturePath: string,
    outputDir?: string,
    options: BidirectionalConversionOptions = {}
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      sourcePath: specularTexturePath,
      outputPaths: {},
      conversionDirection: ConversionDirection.LabPBRToBedrock,
      success: false,
      messages: []
    };
    
    try {
      // Determine output directory
      const finalOutputDir = outputDir || path.dirname(specularTexturePath);
      
      // Load textures
      result.messages.push('Loading textures...');
      const specularTextureData = await TextureLoader.loadTexture(specularTexturePath);
      const normalTextureData = await TextureLoader.loadTexture(normalTexturePath);
      const baseTextureData = await TextureLoader.loadTexture(baseTexturePath);
      
      // Extract channels
      result.messages.push('Extracting channels...');
      const specularChannels = ChannelExtractor.extractChannels(specularTextureData);
      const normalChannels = ChannelExtractor.extractChannels(normalTextureData);
      const baseChannels = ChannelExtractor.extractChannels(baseTextureData);
      
      // Create MER texture
      result.messages.push('Creating MER texture...');
      const merTexture = await this.createMERTexture(
        specularChannels,
        normalChannels,
        specularTextureData.width,
        specularTextureData.height
      );
      
      // Check if subsurface scattering is present
      let hasSubsurface = false;
      const pixelCount = specularTextureData.width * specularTextureData.height;
      
      // Check if any pixel has subsurface scattering (blue channel value 65-255)
      for (let i = 0; i < pixelCount; i++) {
        if (specularChannels.b[i] >= 65) {
          hasSubsurface = true;
          break;
        }
      }
      
      // Determine file suffix based on subsurface presence
      const fileSuffix = hasSubsurface ? '_mers' : '_mer';
      
      // If no subsurface, ensure alpha channel is 100% opaque
      if (!hasSubsurface) {
        const pixelCount = merTexture.width * merTexture.height;
        const alphaOffset = pixelCount * 3; // Alpha starts after RGB
        
        for (let i = 0; i < pixelCount; i++) {
          merTexture.data[alphaOffset + i] = 255; // Set alpha to fully opaque
        }
      }
      
      // Save MER/MERS texture
      const merPath = path.join(finalOutputDir, 
        path.basename(baseTexturePath, path.extname(baseTexturePath)) + fileSuffix + path.extname(baseTexturePath));
      
      await TextureWriter.saveTexture(merTexture, merPath, {
        format: options.outputFormat,
        quality: options.compressionLevel
      });
      
      result.outputPaths.mer = merPath;
      result.messages.push(`Saved ${hasSubsurface ? 'MERS' : 'MER'} texture to: ${path.basename(merPath)}`);
      
      // Create Bedrock normal map
      result.messages.push('Creating Bedrock normal map...');
      const bedrockNormalMap = NormalMapProcessor.reconstructNormalMap(normalTextureData);
      
      // Save Bedrock normal map
      const normalPath = path.join(finalOutputDir, 
        path.basename(baseTexturePath, path.extname(baseTexturePath)) + '_normal' + path.extname(baseTexturePath));
      
      await TextureWriter.saveTexture(bedrockNormalMap, normalPath, {
        format: options.outputFormat,
        quality: options.compressionLevel
      });
      
      result.outputPaths.bedrockNormal = normalPath;
      result.messages.push(`Saved normal map to: ${path.basename(normalPath)}`);
      
      // Extract and save heightmap if requested
      if (options.extractHeightMap !== false && normalTextureData.channels === 4) {
        result.messages.push('Extracting heightmap...');
        const heightMap = NormalMapProcessor.extractHeightMap(normalTextureData);
        
        // Save heightmap
        const heightMapPath = path.join(finalOutputDir, 
          path.basename(baseTexturePath, path.extname(baseTexturePath)) + '_heightmap' + path.extname(baseTexturePath));
        
        await TextureWriter.saveTexture(heightMap, heightMapPath, {
          format: options.outputFormat,
          quality: options.compressionLevel
        });
        
        result.outputPaths.heightMap = heightMapPath;
        result.messages.push(`Saved heightmap to: ${path.basename(heightMapPath)}`);
      }
      
      // Bake AO into base color if requested
      if (options.bakeAO === true) {
        result.messages.push('Baking AO into base color...');
        const baseColorWithAO = NormalMapProcessor.bakeAOIntoBaseColor(
          normalChannels.b,
          baseTextureData
        );
        
        // Save base color with AO
        const baseColorPath = path.join(finalOutputDir, 
          path.basename(baseTexturePath, path.extname(baseTexturePath)) + '_withAO' + path.extname(baseTexturePath));
        
        await TextureWriter.saveTexture(baseColorWithAO, baseColorPath, {
          format: options.outputFormat,
          quality: options.compressionLevel
        });
        
        result.outputPaths.baseColorWithAO = baseColorPath;
        result.messages.push(`Saved base color with AO to: ${path.basename(baseColorPath)}`);
      }
      
      result.success = true;
      return result;
    } catch (error) {
      result.messages.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  
  /**
   * Create a Bedrock MER texture from LabPBR specular channels
   * @param specularChannels Extracted channels from LabPBR specular texture
   * @param normalChannels Extracted channels from LabPBR normal texture (for subsurface data)
   * @param width Texture width
   * @param height Texture height
   * @returns TextureData for the MER texture
   */
  private static async createMERTexture(
    specularChannels: {
      r: Buffer;
      g: Buffer;
      b: Buffer;
      a?: Buffer;
      width: number;
      height: number;
    },
    normalChannels: {
      r: Buffer;
      g: Buffer;
      b: Buffer;
      a?: Buffer;
      width: number;
      height: number;
    },
    width: number,
    height: number
  ): Promise<TextureData> {
    const pixelCount = width * height;
    
    // Create buffers for Bedrock MER channels
    const metallic = Buffer.alloc(pixelCount);  // Red channel - metallic
    const emissive = Buffer.alloc(pixelCount);  // Green channel - emissive
    const roughness = Buffer.alloc(pixelCount); // Blue channel - roughness
    const subsurface = Buffer.alloc(pixelCount); // Alpha channel - subsurface
    
    // Process each pixel
    for (let i = 0; i < pixelCount; i++) {
      // Direct mapping for metallic based on analysis results
      // LabPBR green channel (F0/reflectance) to Bedrock red channel (metallic)
      const f0 = specularChannels.g[i];
      if (f0 >= 230) {
        // Predefined metals (230-255) -> full metallic
        metallic[i] = 255;
      } else if (f0 >= 200) {
        // High F0 values (200-229) -> full metallic
        metallic[i] = 255;
      } else if (f0 >= 150) {
        // Medium-high F0 values (150-199) -> high metallic
        metallic[i] = 230;
      } else if (f0 >= 100) {
        // Medium F0 values (100-149) -> medium metallic
        metallic[i] = 180;
      } else if (f0 >= 50) {
        // Low-medium F0 values (50-99) -> low metallic
        metallic[i] = 100;
      } else {
        // Low F0 values (0-49) -> non-metallic
        metallic[i] = 0;
      }
      
      // Direct inversion for roughness based on analysis results
      // LabPBR red channel (smoothness) to Bedrock blue channel (roughness)
      roughness[i] = 255 - specularChannels.r[i];
      
      // Set emissive to 0 based on expected output
      emissive[i] = 0;
      
      // Check if subsurface scattering is present
      // In LabPBR, blue channel contains porosity (0-64) or subsurface (65-255)
      if (specularChannels.b[i] >= 65) {
        // It's subsurface scattering
        subsurface[i] = specularChannels.b[i];
      } else {
        // No subsurface scattering, set alpha to fully opaque
        subsurface[i] = 255;
      }
    }
    
    // Combine channels into texture data
    return ChannelExtractor.combineChannels({
      r: metallic,
      g: emissive,
      b: roughness,
      a: subsurface,
      width,
      height
    });
  }
}
