import { i18n } from "@lingui/core";
import { messages as en } from "./en";
import { messages as zhHK } from "./zh-HK";
import { messages as zhTW } from "./zh-TW";
import { messages as fr } from "./fr";
import { messages as sv } from "./sv";
import { messages as es } from "./es";
import { messages as de } from "./de";
import { locales } from "./locales";

const preferredLanguage = navigator.languages
  .map((language) => locales.find(({ id }) => language === id || language.startsWith(`${id}-`)))
  .find((language) => language !== undefined);
const savedLocale = localStorage.getItem("locale");
const savedLanguage = locales.find(({ id }) => id === savedLocale);
const locale = savedLanguage
  ? savedLanguage.id
  : preferredLanguage ? preferredLanguage.id : "en";

i18n.load({ en, "zh-HK": zhHK, "zh-TW": zhTW, fr, sv, es, de });
i18n.activate(locale);

function setLocale(locale: (typeof locales)[number]["id"]) {
  localStorage.setItem("locale", locale);
  i18n.activate(locale);
}

export { i18n, setLocale };
