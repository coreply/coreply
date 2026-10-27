import { env } from "cloudflare:workers";

export const cloudOrigins = [
  env.CLOUD_WEB_ORIGIN,
  "chrome-extension://nmfnmclpahgpkgaaigpnclioncflbmhp",
  // Android serves its local wrapper over HTTPS even when the local API is HTTP.
  ...(env.CLOUD_WEB_ORIGIN === "http://localhost:5173"
    ? ["https://localhost:5173"]
    : []),
];
