import { i18n } from "@lingui/core";
import { getLocales } from "expo-localization";
import { messages as en } from "./en";
import { messages as zhHK } from "./zh-HK";
import { messages as zhTW } from "./zh-TW";
import { messages as fr } from "./fr";
import { messages as sv } from "./sv";
import { messages as es } from "./es";
import { messages as de } from "./de";
import { locales } from "./locales";

const preferredLocale = getLocales()
  .map(({ languageCode, regionCode }) => locales.find(
    (locale) => locale === `${languageCode}-${regionCode}` || locale === languageCode,
  ))
  .find((locale) => locale !== undefined);

i18n.load({ en, "zh-HK": zhHK, "zh-TW": zhTW, fr, sv, es, de });
i18n.activate(preferredLocale ?? "en");

export { i18n };
