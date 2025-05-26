/**
 * TextureWriter module for saving converted textures
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { TextureData } from './types';

export class TextureWriter {
  /**
   * Save texture data to a file
   * @param textureData The texture data to save
   * @param outputPath Path where the texture should be saved
   * @param options Optional configuration for saving
   * @returns Promise resolving when the save is complete
   */
  public static async saveTexture(
    textureData: TextureData,
    outputPath: string,
    options: {
      format?: 'png' | 'jpg' | 'tga';
      quality?: number;
    } = {}
  ): Promise<string> {
    try {
      // Ensure the directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create a sharp instance from the raw data
      const image = sharp(textureData.data, {
        raw: {
          width: textureData.width,
          height: textureData.height,
          channels: textureData.channels as 3 | 4
        }
      });
      
      // Determine format from options or file extension
      const format = options.format || path.extname(outputPath).substring(1) || 'png';
      
      // Configure output based on format
      switch (format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          await image.jpeg({
            quality: options.quality || 90
          }).toFile(outputPath);
          break;
        
        case 'tga':
          // Sharp doesn't support TGA directly, would need additional libraries
          throw new Error('TGA format not supported in this version');
        
        case 'png':
        default:
          await image.png({
            compressionLevel: options.quality ? Math.floor(options.quality / 10) : 6
          }).toFile(outputPath);
          break;
      }
      
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to save texture to ${outputPath}: ${error}`);
    }
  }
  
  /**
   * Generate a LabPBR specular texture filename from a source filename
   * @param sourcePath Original texture path
   * @returns Path for the specular texture
   */
  public static getSpecularTexturePath(sourcePath: string): string {
    const dir = path.dirname(sourcePath);
    const baseName = path.basename(sourcePath, path.extname(sourcePath))
      .replace('_mer', '')
      .replace('_diffuse', '')
      .replace('_color', '');
    
    return path.join(dir, `${baseName}_s.png`);
  }
  
  /**
   * Generate a LabPBR normal texture filename from a source filename
   * @param sourcePath Original texture path
   * @returns Path for the normal texture
   */
  public static getNormalTexturePath(sourcePath: string): string {
    const dir = path.dirname(sourcePath);
    const baseName = path.basename(sourcePath, path.extname(sourcePath))
      .replace('_mer', '')
      .replace('_diffuse', '')
      .replace('_color', '');
    
    return path.join(dir, `${baseName}_n.png`);
  }
}
