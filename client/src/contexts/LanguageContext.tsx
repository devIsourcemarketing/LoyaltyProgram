import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Language, autoDetectLanguage, translations } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDetecting: boolean;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [isDetecting, setIsDetecting] = useState(true);

  // Auto-detectar idioma al cargar la aplicación
  useEffect(() => {
    const detectLanguage = async () => {
      console.log('🌍 [LanguageContext] Starting language detection...');
      setIsDetecting(true);
      try {
        // Idiomas disponibles (solo ES y PT)
        const availableLanguages: Language[] = ['es', 'pt'];
        
        // Primero intentar desde localStorage
        const saved = localStorage.getItem('preferred-language') as Language;
        if (saved && translations[saved] && availableLanguages.includes(saved)) {
          console.log(`🌍 [LanguageContext] Using saved language from localStorage: ${saved}`);
          setLanguageState(saved);
          setIsDetecting(false);
          return;
        }

        // Si hay un idioma guardado pero no es válido (ej: 'en'), eliminarlo
        if (saved && !availableLanguages.includes(saved)) {
          console.log(`🌍 [LanguageContext] Removing invalid language from localStorage: ${saved}`);
          localStorage.removeItem('preferred-language');
        }

        // Si no hay guardado o no es válido, detectar por IP
        console.log('🌍 [LanguageContext] No saved language, calling autoDetectLanguage...');
        const detectedLang = await autoDetectLanguage();
        console.log(`🌍 [LanguageContext] Detected language: ${detectedLang}`);
        
        // Asegurar que el idioma detectado está disponible
        const finalLang = availableLanguages.includes(detectedLang) ? detectedLang : 'es';
        setLanguageState(finalLang);
        localStorage.setItem('preferred-language', finalLang);
      } catch (error) {
        console.error('🌍 [LanguageContext] Error detecting language:', error);
        setLanguageState('es'); // Español por defecto
        localStorage.setItem('preferred-language', 'es');
      } finally {
        setIsDetecting(false);
        console.log('🌍 [LanguageContext] Detection complete');
      }
    };

    detectLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('preferred-language', lang);
    setLanguageState(lang);
  };

  // Función de traducción reactiva
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    
    for (const k of keys) {
      result = result?.[k];
    }
    
    return result || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isDetecting, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
