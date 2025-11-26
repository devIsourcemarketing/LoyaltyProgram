-- Crear tabla categories_master si no existe
CREATE TABLE IF NOT EXISTS "categories_master" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_master_name_unique" UNIQUE("name")
);

-- Crear tabla region_categories si no existe  
CREATE TABLE IF NOT EXISTS "region_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Insertar categorías maestras iniciales (ejemplos)
INSERT INTO "categories_master" ("name", "description", "type", "active")
VALUES 
  ('ENTERPRISE', 'Clientes empresariales de gran escala', 'business_type', true),
  ('SMB', 'Pequeñas y medianas empresas', 'business_type', true),
  ('MSSP', 'Proveedores de servicios de seguridad gestionados', 'business_type', true),
  ('Diamond', 'Nivel premium superior', 'tier', true),
  ('Gold', 'Nivel premium medio', 'tier', true),
  ('Silver', 'Nivel estándar', 'tier', true)
ON CONFLICT ("name") DO NOTHING;
