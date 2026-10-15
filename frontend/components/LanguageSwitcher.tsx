"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Field, Select } from "@/components/ui/Field";
import { LOCALE_NAMES, type Locale, dictionaries, isLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <Field label={t("languageLabel")}>
      {(control) => (
        <Select
          {...control}
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
      )}
    </Field>
  );
}
