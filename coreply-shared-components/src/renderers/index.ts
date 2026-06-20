import { renderers as layoutRenderers } from './layout';
import { renderers as inputRenderers } from './input';
import { renderers as selectRenderers } from './select';
import { renderers as checkboxRenderers } from './checkbox';

export * from './input';
export * from './select';
export * from './checkbox';
export * from './layout';

// Combined renderers for convenience
export const customRenderers = [
  ...layoutRenderers,
  ...inputRenderers,
  ...selectRenderers,
  ...checkboxRenderers,
];
