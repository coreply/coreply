import { env } from "cloudflare:workers";

export const cloudOrigins = [env.CLOUD_WEB_ORIGIN, env.CHROME_EXTENSION_ID];
