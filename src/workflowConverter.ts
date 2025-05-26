/**
 * WorkflowConverter module for converting between PBR workflows
 */

import { PredefinedMetal } from './types';

export class WorkflowConverter {
  /**
   * Convert roughness value to perceptual smoothness
   * Formula: perceptualSmoothness = 1.0 - sqrt(roughness)
   * 
   * @param roughness Roughness value (0-255)
   * @returns Perceptual smoothness value (0-255)
   */
  public static roughnessToSmoothness(roughness: number): number {
    // Normalize to 0-1 range
    const normalizedRoughness = roughness / 255;
    
    // Apply conversion formula
    const smoothness = 1.0 - Math.sqrt(normalizedRoughness);
    
    // Convert back to 0-255 range and ensure it's within bounds
    return Math.max(0, Math.min(255, Math.round(smoothness * 255)));
  }
  
  /**
   * Convert perceptual smoothness to roughness
   * Formula: roughness = pow(1.0 - perceptualSmoothness, 2.0)
   * 
   * @param smoothness Perceptual smoothness value (0-255)
   * @returns Roughness value (0-255)
   */
  public static smoothnessToRoughness(smoothness: number): number {
    // Normalize to 0-1 range
    const normalizedSmoothness = smoothness / 255;
    
    // Apply conversion formula
    const roughness = Math.pow(1.0 - normalizedSmoothness, 2.0);
    
    // Convert back to 0-255 range and ensure it's within bounds
    return Math.max(0, Math.min(255, Math.round(roughness * 255)));
  }
  
  /**
   * Convert metallic value to F0 (reflectance) value for LabPBR
   * 
   * @param metallic Metallic value (0-255)
   * @returns F0 value for LabPBR (0-255)
   */
  public static metallicToF0(metallic: number): number {
    // If metallic is high (>200), we'll treat it as a metal
    if (metallic > 200) {
      // Return a value in the metal range (230-255)
      return Math.min(255, 230 + Math.floor((metallic - 200) / 5));
    }
    
    // For non-metals, scale the metallic value to the F0 range (0-229)
    // Most dielectrics have F0 values between 0.04 (10) and 0.08 (20)
    // So we'll use a base value and add a portion of the metallic value
    const baseF0 = 4; // Base F0 for dielectrics
    const maxF0 = 229; // Max F0 for non-metals in LabPBR
    
    // Scale metallic to F0 range
    const scaledF0 = baseF0 + (metallic / 255) * (maxF0 - baseF0);
    
    return Math.round(scaledF0);
  }
  
  /**
   * Convert emissive value from Bedrock to LabPBR format
   * In Bedrock: Green channel, 0-255
   * In LabPBR: Alpha channel, 0-254 (255 is reserved)
   * 
   * @param emissive Emissive value from Bedrock (0-255)
   * @returns Emissive value for LabPBR (0-254)
   */
  public static convertEmissive(emissive: number): number {
    // Scale to 0-254 range to avoid the reserved value of 255
    return Math.min(254, emissive);
  }
  
  /**
   * Determine if a pixel should be treated as a metal based on metallic value
   * 
   * @param metallic Metallic value (0-255)
   * @returns Boolean indicating if the pixel should be treated as a metal
   */
  public static isMetallic(metallic: number): boolean {
    // Typically, values above 200 are considered metallic
    return metallic > 200;
  }
  
  /**
   * Get the appropriate predefined metal value based on color
   * This is a simplified approach - in a real implementation, you might
   * want to compare the color to known metal colors to find the best match
   * 
   * @param r Red component of color (0-255)
   * @param g Green component of color (0-255)
   * @param b Blue component of color (0-255)
   * @returns Predefined metal value for LabPBR
   */
  public static getPredefinedMetal(r: number, g: number, b: number): number {
    // Simple heuristic to determine metal type based on color
    // Gold is yellowish
    if (r > 200 && g > 150 && b < 100) {
      return PredefinedMetal.Gold;
    }
    
    // Copper is reddish
    if (r > 200 && g < 150 && b < 100) {
      return PredefinedMetal.Copper;
    }
    
    // Silver/Aluminum is light gray
    if (r > 200 && g > 200 && b > 200) {
      return PredefinedMetal.Silver;
    }
    
    // Iron/Chrome is medium gray
    if (r > 100 && r < 200 && g > 100 && g < 200 && b > 100 && b < 200) {
      return PredefinedMetal.Iron;
    }
    
    // Default to Iron if no good match
    return PredefinedMetal.Iron;
  }
  
  /**
   * Convert subsurface scattering value from Bedrock to LabPBR format
   * In Bedrock: Alpha channel, 0-255
   * In LabPBR: Blue channel, 65-255 for subsurface scattering
   * 
   * @param subsurface Subsurface value from Bedrock (0-255)
   * @returns Subsurface value for LabPBR (65-255)
   */
  public static convertSubsurface(subsurface: number): number {
    if (subsurface === 0) {
      return 0; // No subsurface scattering
    }
    
    // Scale from 0-255 to 65-255
    return 65 + Math.floor((subsurface / 255) * (255 - 65));
  }
  
  /**
   * Convert porosity value to LabPBR format
   * In LabPBR: Blue channel, 0-64 for porosity
   * 
   * @param porosity Porosity value (0-1)
   * @returns Porosity value for LabPBR (0-64)
   */
  public static convertPorosity(porosity: number): number {
    // Scale from 0-1 to 0-64
    return Math.round(porosity * 64);
  }
}
