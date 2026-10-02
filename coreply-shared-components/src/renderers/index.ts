import { renderers as layoutRenderers } from "./layout";
import { renderers as formRenderers } from "./form";
import { renderers as inputRenderers } from "./input";
import { renderers as selectRenderers } from "./select";
import { renderers as checkboxRenderers } from "./checkbox";
import { renderers as sliderRenderers } from "./slider";
import { renderers as arrayRenderers } from "./array";
import { renderers as jsonRenderers } from "./json";

// Combined renderers for convenience
export const customRenderers = [
  ...arrayRenderers,
  ...jsonRenderers,
  ...layoutRenderers,
  ...formRenderers,
  ...sliderRenderers,
  ...inputRenderers,
  ...selectRenderers,
  ...checkboxRenderers,
];
