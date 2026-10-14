"use client";

import { useLocale } from "@/components/LocaleProvider";
import { LOCALE_NAMES, type Locale, dictionaries, isLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="language" className="text-muted">
        {t("languageLabel")}
      </label>
      <select
        id="language"
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
        className="min-h-11 rounded-full border border-line bg-surface px-3"
      >
        {(Object.keys(dictionaries) as Locale[]).map((code) => (
          <option key={code} value={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
