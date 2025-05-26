/**
 * Main converter class that orchestrates the PBR workflow conversion process
 */

import * as path from 'path';
import { TextureLoader } from './textureLoader';
import { ChannelExtractor } from './channelExtractor';
import { WorkflowConverter } from './workflowConverter';
import { TextureWriter } from './textureWriter';
import { ConversionOptions, ConversionResult, TextureData } from './types';

export class PBRConverter {
  /**
   * Convert a single MER texture to LabPBR format
   * @param merTexturePath Path to the MER texture
   * @param colorTexturePath Path to the color texture (optional, will try to find automatically if not provided)
   * @param outputDir Output directory (optional, defaults to same directory as input)
   * @param options Conversion options
   * @returns Promise resolving to conversion result
   */
  public static async convertTexture(
    merTexturePath: string,
    colorTexturePath?: string,
    outputDir?: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      sourcePath: merTexturePath,
      outputPaths: {},
      success: false,
      messages: []
    };
    
    try {
      // Find color texture if not provided
      if (!colorTexturePath) {
        const foundTexturePath = TextureLoader.findColorTexture(merTexturePath);
        if (!foundTexturePath) {
          throw new Error('Could not find corresponding color texture');
        }
        colorTexturePath = foundTexturePath;
        result.messages.push(`Found color texture: ${path.basename(colorTexturePath)}`);
      }
      
      // Determine output directory
      const finalOutputDir = outputDir || path.dirname(merTexturePath);
      
      // Load textures
      result.messages.push('Loading textures...');
      const merTextureData = await TextureLoader.loadTexture(merTexturePath);
      const colorTextureData = await TextureLoader.loadTexture(colorTexturePath);
      
      // Extract channels
      result.messages.push('Extracting channels...');
      const merChannels = ChannelExtractor.extractMERChannels(merTextureData);
      const colorChannels = ChannelExtractor.extractChannels(colorTextureData);
      
      // Create specular texture (LabPBR _s texture)
      result.messages.push('Creating specular texture...');
      const specularTexture = await this.createSpecularTexture(
        merChannels,
        colorChannels,
        merTextureData.width,
        merTextureData.height
      );
      
      // Save specular texture
      const specularPath = TextureWriter.getSpecularTexturePath(colorTexturePath);
      const finalSpecularPath = outputDir 
        ? path.join(finalOutputDir, path.basename(specularPath))
        : specularPath;
        
      await TextureWriter.saveTexture(specularTexture, finalSpecularPath, {
        format: options.outputFormat,
        quality: options.compressionLevel
      });
      
      result.outputPaths.specular = finalSpecularPath;
      result.messages.push(`Saved specular texture to: ${path.basename(finalSpecularPath)}`);
      
      // If we have a normal map, we could process it here
      // For now, we'll just note that normal map processing would be done here
      result.messages.push('Note: Normal map processing not implemented in this version');
      
      result.success = true;
      return result;
    } catch (error) {
      result.messages.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
  
  /**
   * Create a LabPBR specular texture from MER and color channels
   * @param merChannels Extracted MER channels
   * @param colorChannels Extracted color channels
   * @param width Texture width
   * @param height Texture height
   * @returns TextureData for the specular texture
   */
  private static async createSpecularTexture(
    merChannels: {
      metallic: Buffer;
      emissive: Buffer;
      roughness: Buffer;
      subsurface?: Buffer;
    },
    colorChannels: {
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
    const { metallic, emissive, roughness, subsurface } = merChannels;
    const pixelCount = width * height;
    
    // Create buffers for LabPBR channels
    const smoothness = Buffer.alloc(pixelCount); // Red channel - smoothness
    const f0 = Buffer.alloc(pixelCount);         // Green channel - F0/reflectance
    const porosity = Buffer.alloc(pixelCount);   // Blue channel - porosity/subsurface
    const emission = Buffer.alloc(pixelCount);   // Alpha channel - emission
    
    // Process each pixel
    for (let i = 0; i < pixelCount; i++) {
      // Convert roughness to smoothness (RED channel)
      smoothness[i] = WorkflowConverter.roughnessToSmoothness(roughness[i]);
      
      // Convert metallic to F0 (GREEN channel)
      if (WorkflowConverter.isMetallic(metallic[i])) {
        // For metals, use predefined metal values or derive from color
        f0[i] = WorkflowConverter.getPredefinedMetal(
          colorChannels.r[i],
          colorChannels.g[i],
          colorChannels.b[i]
        );
      } else {
        // For non-metals, convert metallic to F0
        f0[i] = WorkflowConverter.metallicToF0(metallic[i]);
      }
      
      // Handle subsurface scattering/porosity (BLUE channel)
      if (subsurface && subsurface[i] > 0) {
        porosity[i] = WorkflowConverter.convertSubsurface(subsurface[i]);
      } else {
        // Default porosity value - could be customized based on material type
        porosity[i] = WorkflowConverter.convertPorosity(0.1);
      }
      
      // Convert emissive (ALPHA channel)
      emission[i] = WorkflowConverter.convertEmissive(emissive[i]);
    }
    
    // Combine channels into texture data
    return ChannelExtractor.combineChannels({
      r: smoothness,
      g: f0,
      b: porosity,
      a: emission,
      width,
      height
    });
  }
}
