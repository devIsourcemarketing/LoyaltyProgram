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
        // Primero intentar desde localStorage
        const saved = localStorage.getItem('preferred-language') as Language;
        if (saved && translations[saved]) {
          console.log(`🌍 [LanguageContext] Using saved language from localStorage: ${saved}`);
          setLanguageState(saved);
          setIsDetecting(false);
          return;
        }

        // Si no hay guardado, detectar por IP
        console.log('🌍 [LanguageContext] No saved language, calling autoDetectLanguage...');
        const detectedLang = await autoDetectLanguage();
        console.log(`🌍 [LanguageContext] Detected language: ${detectedLang}`);
        setLanguageState(detectedLang);
      } catch (error) {
        console.error('🌍 [LanguageContext] Error detecting language:', error);
        setLanguageState('es'); // Español por defecto
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
