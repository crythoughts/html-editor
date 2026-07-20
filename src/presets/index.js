import { TextPreset } from './TextPreset.js';
import { FlexBlockPreset } from './FlexBlockPreset.js';
import { ImagePreset } from './ImagePreset.js';

/** Array of all available presets. */
export const presets = [
  new TextPreset(),
  new FlexBlockPreset(),
  new ImagePreset(),
];
