import { renderers as layoutRenderers } from './layout';
import { renderers as inputRenderers } from './input';
import { renderers as selectRenderers } from './select';
import { renderers as checkboxRenderers } from './checkbox';
import { renderers as sliderRenderers } from './slider';

export * from './input';
export * from './select';
export * from './checkbox';
export * from './layout';
export * from './slider';

// Combined renderers for convenience
export const customRenderers = [
  ...layoutRenderers,
  ...sliderRenderers,
  ...inputRenderers,
  ...selectRenderers,
  ...checkboxRenderers,
];
