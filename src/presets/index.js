import { TextPreset } from './TextPreset.js';
import { FlexBlockPreset } from './FlexBlockPreset.js';
import { BlockPreset } from './BlockPreset.js';
import { UlPreset } from './UlPreset.js';
import { ImagePreset } from './ImagePreset.js';

/** Array of all available presets. */
export const presets = [
  new BlockPreset(),
  new TextPreset(),
  new FlexBlockPreset(),
  new UlPreset(),
  new ImagePreset(),
];
