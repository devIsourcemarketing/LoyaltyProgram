import type { Request } from "express";

type Language = 'es' | 'pt' | 'en';

interface GeoLocation {
  country_code: string;
  country_name: string;
}

// Mapeo de países a idiomas
const countryToLanguage: Record<string, Language> = {
  // Países de habla hispana
  AR: 'es', // Argentina
  BO: 'es', // Bolivia
  CL: 'es', // Chile
  CO: 'es', // Colombia
  CR: 'es', // Costa Rica
  CU: 'es', // Cuba
  DO: 'es', // República Dominicana
  EC: 'es', // Ecuador
  ES: 'es', // España
  GT: 'es', // Guatemala
  HN: 'es', // Honduras
  MX: 'es', // México
  NI: 'es', // Nicaragua
  PA: 'es', // Panamá
  PE: 'es', // Perú
  PR: 'es', // Puerto Rico
  PY: 'es', // Paraguay
  SV: 'es', // El Salvador
  UY: 'es', // Uruguay
  VE: 'es', // Venezuela
  
  // Países de habla portuguesa
  BR: 'pt', // Brasil
  PT: 'pt', // Portugal
  AO: 'pt', // Angola
  MZ: 'pt', // Mozambique
  
  // Países de habla inglesa
  US: 'en', // Estados Unidos
  GB: 'en', // Reino Unido
  CA: 'en', // Canadá
  AU: 'en', // Australia
  NZ: 'en', // Nueva Zelanda
  IE: 'en', // Irlanda
  ZA: 'en', // Sudáfrica
};

/**
 * Obtiene la IP del cliente desde el request
 */
function getClientIP(req: Request): string | undefined {
  // Intentar obtener la IP real del cliente detrás de proxies
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket.remoteAddress;
}

/**
 * Detecta el idioma basado en la IP del usuario
 * Usa el servicio gratuito ipapi.co para geolocalización
 */
export async function detectLanguageFromIP(req: Request): Promise<Language> {
  try {
    const ip = getClientIP(req);
    
    // Si es localhost o IP privada, retornar español por defecto
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'es';
    }
    
    // Llamar a la API de geolocalización
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'LoyaltyPilot/1.0'
      },
      signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
    });
    
    if (!response.ok) {
      console.warn(`Geolocation API error: ${response.status}`);
      return 'es'; // Español por defecto en caso de error
    }
    
    const data = await response.json() as GeoLocation;
    const countryCode = data.country_code;
    
    // Buscar el idioma para el país
    const language = countryToLanguage[countryCode];
    
    console.log(`IP ${ip} → Country ${countryCode} → Language ${language || 'es (default)'}`);
    
    return language || 'es'; // Español por defecto si el país no está mapeado
    
  } catch (error) {
    console.error('Error detecting language from IP:', error);
    return 'es'; // Español por defecto en caso de error
  }
}

/**
 * Detecta el idioma preferido del usuario
 * Primero intenta por IP, luego por Accept-Language del navegador
 */
export async function detectPreferredLanguage(req: Request): Promise<Language> {
  // Intentar detección por IP
  const ipLanguage = await detectLanguageFromIP(req);
  
  // Si la detección por IP devuelve español por defecto pero podemos obtener
  // info del navegador, usamos eso como fallback
  if (ipLanguage === 'es') {
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      // Parsear el header Accept-Language
      const languages = acceptLanguage.split(',').map(lang => {
        const parts = lang.trim().split(';');
        return parts[0].toLowerCase().split('-')[0];
      });
      
      // Buscar idiomas soportados en orden de preferencia
      for (const lang of languages) {
        if (lang === 'pt' || lang === 'en') {
          return lang as Language;
        }
      }
    }
  }
  
  return ipLanguage;
}
