/**
 * ChannelExtractor module for extracting and manipulating color channels
 */

import { TextureData, ChannelData } from './types';

export class ChannelExtractor {
  /**
   * Extract individual color channels from texture data
   * @param textureData The texture data to extract channels from
   * @returns ChannelData containing separated channels
   */
  public static extractChannels(textureData: TextureData): ChannelData {
    const { width, height, data, channels } = textureData;
    const pixelCount = width * height;
    
    // Create buffers for each channel
    const r = Buffer.alloc(pixelCount);
    const g = Buffer.alloc(pixelCount);
    const b = Buffer.alloc(pixelCount);
    let a: Buffer | undefined;
    
    // If we have an alpha channel, allocate buffer for it
    if (channels === 4) {
      a = Buffer.alloc(pixelCount);
    }
    
    // Extract each channel
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * channels;
      r[i] = data[offset];
      g[i] = data[offset + 1];
      b[i] = data[offset + 2];
      
      if (channels === 4 && a) {
        a[i] = data[offset + 3];
      }
    }
    
    return {
      r,
      g,
      b,
      a,
      width,
      height
    };
  }
  
  /**
   * Extract MER (Metallic, Emissive, Roughness) channels from texture data
   * @param textureData The MER texture data
   * @returns Object containing metallic, emissive, roughness, and subsurface (if available) channels
   */
  public static extractMERChannels(textureData: TextureData): {
    metallic: Buffer;
    emissive: Buffer;
    roughness: Buffer;
    subsurface?: Buffer;
  } {
    const channels = this.extractChannels(textureData);
    
    return {
      metallic: channels.r,    // Red channel = Metallic
      emissive: channels.g,    // Green channel = Emissive
      roughness: channels.b,   // Blue channel = Roughness
      subsurface: channels.a   // Alpha channel = Subsurface Scattering (optional)
    };
  }
  
  /**
   * Combine channels into a single RGBA texture data
   * @param channels The channel data to combine
   * @returns TextureData with combined channels
   */
  public static combineChannels(channels: {
    r: Buffer;
    g: Buffer;
    b: Buffer;
    a?: Buffer;
    width: number;
    height: number;
  }): TextureData {
    const { width, height, r, g, b, a } = channels;
    const pixelCount = width * height;
    const hasAlpha = !!a;
    const channelCount = hasAlpha ? 4 : 3;
    
    // Create buffer for combined data
    const data = Buffer.alloc(pixelCount * channelCount);
    
    // Combine channels
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * channelCount;
      data[offset] = r[i];
      data[offset + 1] = g[i];
      data[offset + 2] = b[i];
      
      if (hasAlpha && a) {
        data[offset + 3] = a[i];
      }
    }
    
    return {
      width,
      height,
      data,
      channels: channelCount
    };
  }
}
