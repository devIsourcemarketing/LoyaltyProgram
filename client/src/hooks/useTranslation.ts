import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Hook para usar traducciones en componentes
 * Wrapper sobre useLanguage para mantener compatibilidad
 */
export function useTranslation() {
  const { language, setLanguage, t } = useLanguage();

  return {
    t,
    currentLanguage: language,
    changeLanguage: setLanguage,
  };
}