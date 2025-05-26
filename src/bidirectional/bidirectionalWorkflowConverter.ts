/**
 * Extended WorkflowConverter module with bidirectional conversion support
 */

import { PredefinedMetal } from '../types';

export class BidirectionalWorkflowConverter {
  /**
   * Convert LabPBR smoothness to Bedrock roughness
   * Formula: roughness = 255 - smoothness
   * 
   * @param smoothness LabPBR smoothness value (0-255)
   * @returns Bedrock roughness value (0-255)
   */
  public static smoothnessToBedrockRoughness(smoothness: number): number {
    // Direct inversion for more accurate results based on expected output
    return 255 - smoothness;
  }
  
  /**
   * Convert LabPBR F0/reflectance to Bedrock metallic
   * 
   * @param f0 LabPBR F0 value (0-255)
   * @returns Bedrock metallic value (0-255)
   */
  public static f0ToMetallic(f0: number): number {
    // Check if this is a predefined metal (230-255)
    if (f0 >= 230) {
      // All predefined metals map to full metallic in Bedrock
      return 255;
    }
    
    // For high F0 values (200-229), treat as highly metallic
    if (f0 >= 200) {
      return 255; // Full metallic for high F0 values
    }
    
    // For medium-high F0 values (150-199), treat as mostly metallic
    if (f0 >= 150) {
      return 230; // High metallic
    }
    
    // For medium F0 values (100-149), treat as moderately metallic
    if (f0 >= 100) {
      return 180; // Medium metallic
    }
    
    // For low-medium F0 values (50-99), treat as slightly metallic
    if (f0 >= 50) {
      return 100; // Low metallic
    }
    
    // For low F0 values (0-49), treat as non-metallic
    return 0; // Non-metallic
  }
  
  /**
   * Convert LabPBR emissive to Bedrock emissive
   * 
   * @param emissive LabPBR emissive value (0-254)
   * @returns Bedrock emissive value (0-255)
   */
  public static labPBREmissiveToBedrockEmissive(emissive: number): number {
    // In LabPBR, 255 is reserved, so the range is 0-254
    // In Bedrock, the full 0-255 range is used
    // We'll scale the 0-254 range to 0-255
    if (emissive === 0) {
      return 0; // No emission
    }
    
    return Math.min(255, Math.round((emissive / 254) * 255));
  }
  
  /**
   * Convert LabPBR subsurface scattering to Bedrock subsurface
   * 
   * @param subsurface LabPBR subsurface value (65-255)
   * @returns Bedrock subsurface value (0-255)
   */
  public static labPBRSubsurfaceToBedrockSubsurface(subsurface: number): number {
    // In LabPBR, subsurface is 65-255
    // In Bedrock, subsurface is 0-255
    if (subsurface < 65) {
      // This is porosity in LabPBR, not subsurface
      return 0;
    }
    
    // Scale from 65-255 to 0-255
    return Math.round(((subsurface - 65) / 190) * 255);
  }
  
  /**
   * Reconstruct normal map blue channel from red and green channels
   * 
   * @param r Red channel value (0-255)
   * @param g Green channel value (0-255)
   * @returns Reconstructed blue channel value (0-255)
   */
  public static reconstructNormalMapBlueChannel(r: number, g: number): number {
    // Normalize to 0-1 range
    const normalizedR = r / 255;
    const normalizedG = g / 255;
    
    // Reconstruct blue using the formula:
    // b = sqrt(1 - (r*r + g*g))
    // Ensure the value is between 0 and 1
    let b = Math.sqrt(1 - Math.min(1, normalizedR*normalizedR + normalizedG*normalizedG));
    
    // Handle NaN or negative values
    if (isNaN(b) || b < 0) {
      b = 0;
    }
    
    // Convert back to 0-255 range
    return Math.round(b * 255);
  }
  
  /**
   * Determine if a value in the LabPBR green channel represents a predefined metal
   * 
   * @param f0 F0 value from LabPBR green channel (0-255)
   * @returns Boolean indicating if this is a predefined metal
   */
  public static isPredefinedMetal(f0: number): boolean {
    return f0 >= 230 && f0 <= 255;
  }
  
  /**
   * Get the specific predefined metal type from LabPBR green channel value
   * 
   * @param f0 F0 value from LabPBR green channel (230-255)
   * @returns PredefinedMetal enum value
   */
  public static getPredefinedMetalType(f0: number): PredefinedMetal | null {
    if (f0 >= 230 && f0 <= 237) {
      return f0 as PredefinedMetal;
    }
    
    if (f0 >= 238 && f0 <= 255) {
      // For values outside the specific range, default to treating as custom metal
      return null;
    }
    
    return null;
  }
}
