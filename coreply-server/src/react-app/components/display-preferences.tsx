import { useLingui } from "@lingui/react/macro";
import { GlobeIcon } from "lucide-react";
import { useEffect, useState, type ComponentProps, type ReactElement } from "react";
import { setLocale } from "@server/i18n";
import { locales } from "@server/i18n/locales";
import { Classic } from "./ui/classic";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function LanguageSwitcher({ trigger, align, side }: {
  trigger: ReactElement;
} & Pick<ComponentProps<typeof DropdownMenuContent>, "align" | "side">) {
  const { i18n, t } = useLingui();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={trigger}
        aria-label={t({ message: "Language", comment: "Menu for changing the site's display language" })}
      >
        <GlobeIcon data-icon="inline-start" aria-hidden="true" />
        {locales.find(({ id }) => id === i18n.locale)?.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side}>
        <DropdownMenuGroup>
          {locales.map(({ id, name }) => (
            <DropdownMenuCheckboxItem key={id} checked={i18n.locale === id} onClick={() => setLocale(id)}>
              {name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { t } = useLingui();
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" || (savedTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) setDark(event.matches);
    };
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);
  return (
    <Classic
      toggled={dark}
      onClick={() => {
        const nextTheme = dark ? "light" : "dark";
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(nextTheme);
        localStorage.setItem("theme", nextTheme);
        setDark(!dark);
      }}
      aria-label={t({ message: "Dark mode", comment: "Toggle for the site's dark color theme" })}
      title={t({ message: "Dark mode", comment: "Toggle for the site's dark color theme" })}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
