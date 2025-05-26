/**
 * Updated CLI module with bidirectional conversion support
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { PBRConverter } from '../pbrConverter';
import { ConversionOptions } from '../types';
import { BidirectionalConverter, BidirectionalConversionOptions } from './bidirectionalConverter';
import { ConversionDirection } from './formatDetector';

// Create CLI program
const program = new Command();

program
  .name('pbr-converter')
  .description('Convert between Minecraft Bedrock RTX and LabPBR texture formats')
  .version('1.1.0');

// Command to convert a single texture (Bedrock to LabPBR - original functionality)
program
  .command('convert')
  .description('Convert a Bedrock MER texture to LabPBR format')
  .argument('<merTexturePath>', 'Path to the MER texture file')
  .option('-c, --color <path>', 'Path to the color texture file (will try to find automatically if not provided)')
  .option('-o, --output <dir>', 'Output directory (defaults to same directory as input)')
  .option('-f, --format <format>', 'Output format (png, jpg, tga)', 'png')
  .option('-q, --quality <level>', 'Compression level (1-10)', '8')
  .action(async (merTexturePath, options) => {
    try {
      console.log(`Converting ${merTexturePath} from Bedrock to LabPBR...`);
      
      const conversionOptions: ConversionOptions = {
        outputFormat: options.format as 'png' | 'jpg' | 'tga',
        compressionLevel: parseInt(options.quality, 10)
      };
      
      const result = await PBRConverter.convertTexture(
        merTexturePath,
        options.color,
        options.output,
        conversionOptions
      );
      
      if (result.success) {
        console.log('Conversion successful!');
        console.log('Output files:');
        Object.entries(result.outputPaths).forEach(([type, path]) => {
          console.log(`- ${type}: ${path}`);
        });
      } else {
        console.error('Conversion failed:');
        result.messages.forEach(msg => console.error(`- ${msg}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command to convert LabPBR to Bedrock
program
  .command('convert-to-bedrock')
  .description('Convert LabPBR textures to Bedrock format')
  .argument('<specularTexturePath>', 'Path to the LabPBR specular (_s) texture file')
  .requiredOption('-n, --normal <path>', 'Path to the LabPBR normal (_n) texture file')
  .option('-c, --color <path>', 'Path to the base color texture file (will try to find automatically if not provided)')
  .option('-o, --output <dir>', 'Output directory (defaults to same directory as input)')
  .option('-f, --format <format>', 'Output format (png, jpg, tga)', 'png')
  .option('-q, --quality <level>', 'Compression level (1-10)', '8')
  .option('-b, --bake-ao', 'Bake ambient occlusion into base color texture', false)
  .option('-e, --extract-height', 'Extract heightmap from normal texture', true)
  .action(async (specularTexturePath, options) => {
    try {
      console.log(`Converting ${specularTexturePath} from LabPBR to Bedrock...`);
      
      const conversionOptions: BidirectionalConversionOptions = {
        outputFormat: options.format as 'png' | 'jpg' | 'tga',
        compressionLevel: parseInt(options.quality, 10),
        conversionDirection: ConversionDirection.LabPBRToBedrock,
        bakeAO: options.bakeAo,
        extractHeightMap: options.extractHeight
      };
      
      // Find base color texture if not provided
      let baseTexturePath = options.color;
      if (!baseTexturePath) {
        const dir = path.dirname(specularTexturePath);
        const baseName = path.basename(specularTexturePath, path.extname(specularTexturePath)).replace('_s', '');
        const possiblePath = path.join(dir, `${baseName}${path.extname(specularTexturePath)}`);
        
        if (fs.existsSync(possiblePath)) {
          baseTexturePath = possiblePath;
          console.log(`Found base color texture: ${path.basename(baseTexturePath)}`);
        } else {
          console.error('Could not find base color texture. Please provide it with -c option.');
          process.exit(1);
        }
      }
      
      const result = await BidirectionalConverter.convertLabPBRToBedrock(
        specularTexturePath,
        options.normal,
        baseTexturePath,
        options.output,
        conversionOptions
      );
      
      if (result.success) {
        console.log('Conversion successful!');
        console.log('Output files:');
        Object.entries(result.outputPaths).forEach(([type, path]) => {
          if (path) {
            console.log(`- ${type}: ${path}`);
          }
        });
      } else {
        console.error('Conversion failed:');
        result.messages.forEach(msg => console.error(`- ${msg}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command for automatic format detection and conversion
program
  .command('convert-auto')
  .description('Automatically detect format and convert in the appropriate direction')
  .argument('<texturePath>', 'Path to any texture file (base, MER, specular, normal)')
  .option('-o, --output <dir>', 'Output directory (defaults to same directory as input)')
  .option('-f, --format <format>', 'Output format (png, jpg, tga)', 'png')
  .option('-q, --quality <level>', 'Compression level (1-10)', '8')
  .option('-b, --bake-ao', 'Bake ambient occlusion into base color texture when converting to Bedrock', false)
  .option('-e, --extract-height', 'Extract heightmap when converting to Bedrock', true)
  .option('-d, --direction <direction>', 'Force conversion direction (auto, to-labpbr, to-bedrock)', 'auto')
  .action(async (texturePath, options) => {
    try {
      console.log(`Analyzing ${texturePath} for automatic conversion...`);
      
      // Determine conversion direction
      let direction = ConversionDirection.Auto;
      if (options.direction === 'to-labpbr') {
        direction = ConversionDirection.BedrockToLabPBR;
      } else if (options.direction === 'to-bedrock') {
        direction = ConversionDirection.LabPBRToBedrock;
      }
      
      const conversionOptions: BidirectionalConversionOptions = {
        outputFormat: options.format as 'png' | 'jpg' | 'tga',
        compressionLevel: parseInt(options.quality, 10),
        conversionDirection: direction,
        bakeAO: options.bakeAo,
        extractHeightMap: options.extractHeight
      };
      
      const result = await BidirectionalConverter.convertAuto(
        texturePath,
        options.output,
        conversionOptions
      );
      
      if (result.success) {
        console.log('Conversion successful!');
        console.log(`Direction: ${result.conversionDirection !== undefined ? ConversionDirection[result.conversionDirection] : 'Auto'}`);
        console.log('Output files:');
        Object.entries(result.outputPaths).forEach(([type, path]) => {
          if (path) {
            console.log(`- ${type}: ${path}`);
          }
        });
      } else {
        console.error('Conversion failed:');
        result.messages.forEach(msg => console.error(`- ${msg}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Command to convert a directory of textures
program
  .command('convert-dir')
  .description('Convert all textures in a directory (with automatic format detection)')
  .argument('<inputDir>', 'Directory containing textures')
  .option('-o, --output <dir>', 'Output directory (defaults to same directory as input)')
  .option('-f, --format <format>', 'Output format (png, jpg, tga)', 'png')
  .option('-q, --quality <level>', 'Compression level (1-10)', '8')
  .option('-r, --recursive', 'Process subdirectories recursively', false)
  .option('-b, --bake-ao', 'Bake ambient occlusion into base color texture when converting to Bedrock', false)
  .option('-e, --extract-height', 'Extract heightmap when converting to Bedrock', true)
  .action(async (inputDir, options) => {
    try {
      console.log(`Processing directory ${inputDir}...`);
      
      // Find all texture files in the directory
      const findTextureFiles = (dir: string, recursive: boolean): string[] => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let textureFiles: string[] = [];
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory() && recursive) {
            textureFiles = textureFiles.concat(findTextureFiles(fullPath, recursive));
          } else if (file.isFile() && 
                    (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.tga'))) {
            textureFiles.push(fullPath);
          }
        }
        
        return textureFiles;
      };
      
      const textureFiles = findTextureFiles(inputDir, options.recursive);
      
      if (textureFiles.length === 0) {
        console.error('No texture files found in the specified directory');
        process.exit(1);
      }
      
      console.log(`Found ${textureFiles.length} texture files`);
      
      const conversionOptions: BidirectionalConversionOptions = {
        outputFormat: options.format as 'png' | 'jpg' | 'tga',
        compressionLevel: parseInt(options.quality, 10),
        bakeAO: options.bakeAo,
        extractHeightMap: options.extractHeight
      };
      
      // Process each texture set only once
      const processedSets = new Set<string>();
      let successCount = 0;
      let failCount = 0;
      
      for (const texturePath of textureFiles) {
        // Get base name without suffixes
        const dir = path.dirname(texturePath);
        const fileName = path.basename(texturePath);
        const baseName = path.basename(texturePath, path.extname(texturePath))
          .replace('_s', '')
          .replace('_n', '')
          .replace('_mer', '')
          .replace('_normal', '')
          .replace('_heightmap', '');
        
        // Skip if we've already processed this texture set
        if (processedSets.has(path.join(dir, baseName))) {
          continue;
        }
        
        console.log(`\nProcessing texture set: ${baseName}`);
        
        try {
          const result = await BidirectionalConverter.convertAuto(
            texturePath,
            options.output,
            conversionOptions
          );
          
          if (result.success) {
            successCount++;
            console.log(`  Success! (${result.conversionDirection !== undefined ? ConversionDirection[result.conversionDirection] : 'Auto'})`);
            console.log('  Output files:');
            Object.entries(result.outputPaths).forEach(([type, path]) => {
              if (path) {
                console.log(`  - ${type}: ${path.split('/').pop()}`);
              }
            });
            
            // Mark this texture set as processed
            processedSets.add(path.join(dir, baseName));
          } else {
            failCount++;
            console.error('  Failed:');
            result.messages.forEach(msg => console.error(`  - ${msg}`));
          }
        } catch (error) {
          failCount++;
          console.error('  Error:', error instanceof Error ? error.message : String(error));
        }
      }
      
      console.log('\nConversion complete!');
      console.log(`Successfully converted: ${successCount} texture sets`);
      console.log(`Failed conversions: ${failCount} texture sets`);
      
      if (failCount > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}
