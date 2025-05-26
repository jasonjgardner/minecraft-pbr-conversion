/**
 * NormalMapProcessor module for handling normal maps and heightmaps
 */

import * as fs from 'fs';
import * as path from 'path';
import { TextureData, ChannelData } from '../types';
import { ChannelExtractor } from '../channelExtractor';

export class NormalMapProcessor {
  /**
   * Extract heightmap from LabPBR normal texture's alpha channel
   * @param normalTextureData The normal texture data
   * @returns TextureData for the heightmap
   */
  public static extractHeightMap(normalTextureData: TextureData): TextureData {
    const { width, height, channels } = normalTextureData;
    
    // Check if we have an alpha channel
    if (channels !== 4) {
      throw new Error('Normal texture does not have an alpha channel for heightmap extraction');
    }
    
    // Extract channels
    const channelData = ChannelExtractor.extractChannels(normalTextureData);
    
    if (!channelData.a) {
      throw new Error('Failed to extract alpha channel from normal texture');
    }
    
    // Create a grayscale heightmap texture
    const heightmapData = Buffer.alloc(width * height);
    
    // Copy alpha channel to heightmap
    for (let i = 0; i < width * height; i++) {
      heightmapData[i] = channelData.a[i];
    }
    
    // Return as a single-channel texture
    return {
      width,
      height,
      data: heightmapData,
      channels: 1
    };
  }
  
  /**
   * Reconstruct normal map blue channel from red and green channels
   * @param normalTextureData The normal texture data
   * @returns TextureData with reconstructed blue channel
   */
  public static reconstructNormalMap(normalTextureData: TextureData): TextureData {
    const { width, height } = normalTextureData;
    
    // Extract channels
    const channelData = ChannelExtractor.extractChannels(normalTextureData);
    
    // Create output buffer for RGB normal map
    const outputData = Buffer.alloc(width * height * 3);
    
    // Process each pixel
    for (let i = 0; i < width * height; i++) {
      const r = channelData.r[i] / 255; // Normalize to 0-1
      const g = channelData.g[i] / 255; // Normalize to 0-1
      
      // Reconstruct blue channel using the formula:
      // b = sqrt(1 - (r*r + g*g))
      // Ensure the value is between 0 and 1
      let b = Math.sqrt(1 - Math.min(1, r*r + g*g));
      
      // Handle NaN or negative values
      if (isNaN(b) || b < 0) {
        b = 0;
      }
      
      // Convert back to 0-255 range
      const bValue = Math.round(b * 255);
      
      // Write to output buffer
      const outOffset = i * 3;
      outputData[outOffset] = channelData.r[i];     // R
      outputData[outOffset + 1] = channelData.g[i]; // G
      outputData[outOffset + 2] = bValue;           // B
    }
    
    return {
      width,
      height,
      data: outputData,
      channels: 3
    };
  }
  
  /**
   * Bake ambient occlusion into base color texture
   * @param aoData Buffer containing AO data (0 = 100% AO, 255 = 0% AO)
   * @param baseColorData Base color texture data
   * @returns TextureData with AO baked in
   */
  public static bakeAOIntoBaseColor(aoData: Buffer, baseColorData: TextureData): TextureData {
    const { width, height, channels } = baseColorData;
    
    // Create output buffer
    const outputData = Buffer.alloc(width * height * channels);
    
    // Process each pixel
    for (let i = 0; i < width * height; i++) {
      // Calculate AO factor (invert the value since in LabPBR, 0 = 100% AO and 255 = 0% AO)
      const aoFactor = 1 - (aoData[i] / 255);
      
      // Apply AO to each channel
      const inOffset = i * channels;
      const outOffset = i * channels;
      
      for (let c = 0; c < channels; c++) {
        // Apply AO to color channels (RGB), but not to alpha
        if (c < 3) {
          // Darken the color based on AO factor
          outputData[outOffset + c] = Math.round(baseColorData.data[inOffset + c] * (1 - aoFactor * 0.5));
        } else {
          // Copy alpha channel as is
          outputData[outOffset + c] = baseColorData.data[inOffset + c];
        }
      }
    }
    
    return {
      width,
      height,
      data: outputData,
      channels
    };
  }
  
  /**
   * Create a DirectX format normal map from X and Y components
   * @param normalX Buffer containing X component
   * @param normalY Buffer containing Y component
   * @param width Width of the texture
   * @param height Height of the texture
   * @returns TextureData for the normal map
   */
  public static createDirectXNormalMap(normalX: Buffer, normalY: Buffer, width: number, height: number): TextureData {
    // Create output buffer for RGB normal map
    const outputData = Buffer.alloc(width * height * 3);
    
    // Process each pixel
    for (let i = 0; i < width * height; i++) {
      const r = normalX[i] / 255; // Normalize to 0-1
      const g = normalY[i] / 255; // Normalize to 0-1
      
      // Reconstruct blue channel
      let b = Math.sqrt(1 - Math.min(1, r*r + g*g));
      
      // Handle NaN or negative values
      if (isNaN(b) || b < 0) {
        b = 0;
      }
      
      // Convert back to 0-255 range
      const bValue = Math.round(b * 255);
      
      // Write to output buffer
      const outOffset = i * 3;
      outputData[outOffset] = normalX[i];     // R
      outputData[outOffset + 1] = normalY[i]; // G
      outputData[outOffset + 2] = bValue;     // B
    }
    
    return {
      width,
      height,
      data: outputData,
      channels: 3
    };
  }
}
