import { useTranslation } from "react-i18next";

const languages = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
] as const;

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage?.startsWith("pt") ? "pt" : "en";

  return (
    <div
      aria-label={t("language_switcher_label")}
      className="inline-flex rounded-full border border-foreground/12 bg-white/5 p-1"
      role="group"
    >
      {languages.map((language) => (
        <button
          aria-pressed={activeLanguage === language.code}
          className={`min-h-[34px] min-w-[42px] rounded-full px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeLanguage === language.code
              ? "bg-primary text-white"
              : "text-foreground/76 hover:bg-white/8"
          }`}
          key={language.code}
          onClick={() => void i18n.changeLanguage(language.code)}
          type="button"
        >
          {language.label}
        </button>
      ))}
    </div>
  );
};
