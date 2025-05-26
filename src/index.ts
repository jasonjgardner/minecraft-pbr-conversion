/**
 * Updated index file that exports all modules including bidirectional conversion
 */

// Original modules
export * from './types';
export * from './textureLoader';
export * from './channelExtractor';
export * from './workflowConverter';
export * from './textureWriter';
export * from './pbrConverter';

// Bidirectional modules
export * from './bidirectional/formatDetector';
export * from './bidirectional/normalMapProcessor';
export * from './bidirectional/bidirectionalWorkflowConverter';
export * from './bidirectional/bidirectionalConverter';
