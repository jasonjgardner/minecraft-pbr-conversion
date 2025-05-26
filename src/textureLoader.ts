/**
 * TextureLoader module for loading texture files
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { TextureData } from './types';

export class TextureLoader {
  /**
   * Load a texture file from the filesystem
   * @param filePath Path to the texture file
   * @returns Promise resolving to TextureData
   */
  public static async loadTexture(filePath: string): Promise<TextureData> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Texture file not found: ${filePath}`);
      }

      // Load the image using sharp
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      // Ensure we have width and height
      if (!metadata.width || !metadata.height) {
        throw new Error(`Invalid image dimensions for ${filePath}`);
      }

      // Get raw pixel data
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      return {
        width: metadata.width,
        height: metadata.height,
        data,
        channels: info.channels
      };
    } catch (error) {
      throw new Error(`Failed to load texture ${filePath}: ${error}`);
    }
  }

  /**
   * Check if a file is a MER texture based on naming convention
   * @param filePath Path to the texture file
   * @returns boolean indicating if the file is a MER texture
   */
  public static isMERTexture(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    return fileName.includes('_mer') || fileName.endsWith('_mer.png');
  }

  /**
   * Find the corresponding color texture for a MER texture
   * @param merFilePath Path to the MER texture file
   * @returns Path to the color texture or null if not found
   */
  public static findColorTexture(merFilePath: string): string | null {
    const dir = path.dirname(merFilePath);
    const baseName = path.basename(merFilePath)
      .toLowerCase()
      .replace('_mer.png', '')
      .replace('_mer', '');
    
    // Check for common color texture patterns
    const possibleNames = [
      `${baseName}.png`,
      `${baseName}_color.png`,
      `${baseName}_diffuse.png`
    ];
    
    for (const name of possibleNames) {
      const colorPath = path.join(dir, name);
      if (fs.existsSync(colorPath)) {
        return colorPath;
      }
    }
    
    return null;
  }
}
