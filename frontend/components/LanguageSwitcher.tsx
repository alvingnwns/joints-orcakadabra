"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Select } from "@/components/ui/Field";
import { LOCALE_NAMES, type Locale, dictionaries, isLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2 text-sm">
      <label htmlFor="language" className="sr-only text-text-secondary sm:not-sr-only">
        {t("languageLabel")}
      </label>
      <Select
        id="language"
        inline
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        {(Object.keys(dictionaries) as Locale[]).map((code) => (
          <option key={code} value={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </Select>
    </div>
  );
}
