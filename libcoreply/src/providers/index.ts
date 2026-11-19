import { advancedProvider } from "./definitions/advanced";
import { azureProvider, azureStatefulProvider } from "./definitions/azure";
import { coreplyCloudProvider, coreplyCloudStatefulProvider } from "./definitions/coreply-cloud";
import type { ProviderDefinition } from "./definition";
import { fimProvider } from "./definitions/fim";
import { gatewayProvider, gatewayStatefulProvider } from "./definitions/gateway";
import { googleProvider, googleStatefulProvider } from "./definitions/google";
import { googleVertexProvider, googleVertexStatefulProvider } from "./definitions/google-vertex";
import { groqProvider, groqStatefulProvider } from "./definitions/groq";
import { minimaxProvider, minimaxStatefulProvider } from "./definitions/minimax";
import { mistralProvider, mistralStatefulProvider } from "./definitions/mistral";
import { openaiProvider, openaiStatefulProvider } from "./definitions/openai";
import { openaiCompatibleProvider, openaiCompatibleStatefulProvider } from "./definitions/openai-compatible";
import { openrouterProvider, openrouterStatefulProvider } from "./definitions/openrouter";
import { xaiProvider, xaiStatefulProvider } from "./definitions/xai";

export const providerDefinitions = {
  coreplyCloudStateful: coreplyCloudStatefulProvider,
  openaiStateful: openaiStatefulProvider,
  openaiCompatibleStateful: openaiCompatibleStatefulProvider,
  openrouterStateful: openrouterStatefulProvider,
  azureStateful: azureStatefulProvider,
  xaiStateful: xaiStatefulProvider,
  mistralStateful: mistralStatefulProvider,
  groqStateful: groqStatefulProvider,
  googleStateful: googleStatefulProvider,
  googleVertexStateful: googleVertexStatefulProvider,
  minimaxStateful: minimaxStatefulProvider,
  gatewayStateful: gatewayStatefulProvider,
  fim: fimProvider,
  advanced: advancedProvider,
  coreplyCloud: coreplyCloudProvider,
  openai: openaiProvider,
  openaiCompatible: openaiCompatibleProvider,
  openrouter: openrouterProvider,
  azure: azureProvider,
  xai: xaiProvider,
  mistral: mistralProvider,
  groq: groqProvider,
  google: googleProvider,
  googleVertex: googleVertexProvider,
  minimax: minimaxProvider,
  gateway: gatewayProvider,
} satisfies Record<string, ProviderDefinition>;

export * from "./definitions/advanced";
export * from "./base";
export * from "./definition";
export * from "./definitions/coreply-cloud";
export * from "./create-instance";
export * from "./definitions/fim";
export { GoogleVertexBaseProviderSchema } from "./definitions/google-vertex";
export * from "./instance";
export * from "./settings";
export * from "./stateless";
export * from "./stateful";
