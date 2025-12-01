import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Language, autoDetectLanguage, translations } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDetecting: boolean;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [isDetecting, setIsDetecting] = useState(true);

  // Auto-detectar idioma al cargar la aplicación
  useEffect(() => {
    const detectLanguage = async () => {
      setIsDetecting(true);
      try {
        // Primero intentar desde localStorage
        const saved = localStorage.getItem('preferred-language') as Language;
        if (saved && translations[saved]) {
          setLanguageState(saved);
          setIsDetecting(false);
          return;
        }

        // Si no hay guardado, detectar por IP
        const detectedLang = await autoDetectLanguage();
        setLanguageState(detectedLang);
      } catch (error) {
        console.error('Error detecting language:', error);
        setLanguageState('es'); // Español por defecto
      } finally {
        setIsDetecting(false);
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

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
