// Estructura jerárquica: Región → Países (opcionales) → Ciudades (opcionales)
export const REGION_HIERARCHY: Record<string, Record<string, string[]>> = {
  NOLA: {
    "COLOMBIA": ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"],
    "CENTRO AMERICA": ["Guatemala", "San Salvador", "Tegucigalpa", "Managua", "San José", "Panamá"],
  },
  SOLA: {
    "ARGENTINA": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"],
    "CHILE": ["Santiago", "Valparaíso", "Concepción", "La Serena", "Antofagasta"],
    "PERU": ["Lima", "Arequipa", "Cusco", "Trujillo"],
    "OTROS": [], // Para otros países de SOLA sin ciudades específicas
  },
  BRASIL: {
    "": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Curitiba", "Recife"],
  },
  MEXICO: {
    "": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Querétaro", "Mérida"],
  },
};

// Categorías disponibles por región
export const REGION_CATEGORIES: Record<string, string[]> = {
  NOLA: ["ENTERPRISE", "SMB", "MSSP"],
  SOLA: ["ENTERPRISE", "SMB"],
  BRASIL: ["ENTERPRISE", "SMB"],
  MEXICO: ["ENTERPRISE", "SMB"], // Categorías base, los niveles van en subcategoría
};

// Niveles/subcategorías para MÉXICO según la categoría
export const MEXICO_LEVELS: Record<string, string[]> = {
  ENTERPRISE: ["PLATINUM", "GOLD (2)"],
  SMB: ["PLATINUM", "GOLD (2)", "SILVER & REGISTERED"],
};

// Lista de regiones disponibles
export const REGIONS = ["NOLA", "SOLA", "BRASIL", "MEXICO"] as const;
export type Region = typeof REGIONS[number];

// Lista de categorías disponibles
export const CATEGORIES = ["ENTERPRISE", "SMB", "MSSP"] as const;
export type Category = typeof CATEGORIES[number];

// Partner Categories (niveles de certificación del partner)
export const PARTNER_CATEGORIES = ["REGISTERED", "CERTIFIED", "GOLD", "PLATINUM"] as const;
export type PartnerCategory = typeof PARTNER_CATEGORIES[number];

// Market Segments (segmentos de mercado)
export const MARKET_SEGMENTS = ["SMB", "Enterprise", "MSSP"] as const;
export type MarketSegment = typeof MARKET_SEGMENTS[number];
