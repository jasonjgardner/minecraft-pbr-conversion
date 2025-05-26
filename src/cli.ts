/**
 * Main entry point for the CLI application
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { PBRConverter } from './pbrConverter';
import { ConversionOptions } from './types';

// Create CLI program
const program = new Command();

program
  .name('pbr-converter')
  .description('Convert Minecraft Bedrock RTX textures to LabPBR format')
  .version('1.0.0');

// Command to convert a single texture
program
  .command('convert')
  .description('Convert a single MER texture to LabPBR format')
  .argument('<merTexturePath>', 'Path to the MER texture file')
  .option('-c, --color <path>', 'Path to the color texture file (will try to find automatically if not provided)')
  .option('-o, --output <dir>', 'Output directory (defaults to same directory as input)')
  .option('-f, --format <format>', 'Output format (png, jpg, tga)', 'png')
  .option('-q, --quality <level>', 'Compression level (1-10)', '8')
  .action(async (merTexturePath, options) => {
    try {
      console.log(`Converting ${merTexturePath}...`);
      
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

// Command to convert a directory of textures
program
  .command('convert-dir')
  .description('Convert all MER textures in a directory to LabPBR format')
  .argument('<inputDir>', 'Directory containing MER textures')
  .option('-o, --output <dir>', 'Output directory (defaults to same directory as input)')
  .option('-f, --format <format>', 'Output format (png, jpg, tga)', 'png')
  .option('-q, --quality <level>', 'Compression level (1-10)', '8')
  .option('-r, --recursive', 'Process subdirectories recursively', false)
  .action(async (inputDir, options) => {
    try {
      console.log(`Processing directory ${inputDir}...`);
      
      // Find all MER textures in the directory
      const findMERTextures = (dir: string, recursive: boolean): string[] => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let merTextures: string[] = [];
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory() && recursive) {
            merTextures = merTextures.concat(findMERTextures(fullPath, recursive));
          } else if (file.isFile() && file.name.toLowerCase().includes('_mer') && 
                    (file.name.endsWith('.png') || file.name.endsWith('.jpg'))) {
            merTextures.push(fullPath);
          }
        }
        
        return merTextures;
      };
      
      const merTextures = findMERTextures(inputDir, options.recursive);
      
      if (merTextures.length === 0) {
        console.error('No MER textures found in the specified directory');
        process.exit(1);
      }
      
      console.log(`Found ${merTextures.length} MER textures`);
      
      const conversionOptions: ConversionOptions = {
        outputFormat: options.format as 'png' | 'jpg' | 'tga',
        compressionLevel: parseInt(options.quality, 10)
      };
      
      let successCount = 0;
      let failCount = 0;
      
      // Process each texture
      for (const merTexture of merTextures) {
        console.log(`Converting ${path.basename(merTexture)}...`);
        
        const result = await PBRConverter.convertTexture(
          merTexture,
          undefined, // Let it find the color texture automatically
          options.output,
          conversionOptions
        );
        
        if (result.success) {
          successCount++;
          console.log('  Success!');
        } else {
          failCount++;
          console.error('  Failed:');
          result.messages.forEach(msg => console.error(`  - ${msg}`));
        }
      }
      
      console.log('\nConversion complete!');
      console.log(`Successfully converted: ${successCount}`);
      console.log(`Failed conversions: ${failCount}`);
      
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
