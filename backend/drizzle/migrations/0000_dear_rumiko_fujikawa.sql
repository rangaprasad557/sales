CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"picture" text,
	"google_id" varchar(255),
	"role" varchar(64) DEFAULT 'salesperson' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" integer,
	"icon" varchar(64) DEFAULT 'folder',
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"payment_terms" varchar(100) DEFAULT 'Immediate' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"barcode" varchar(100),
	"category_id" integer,
	"unit" varchar(50) DEFAULT 'pcs' NOT NULL,
	"min_stock_threshold" integer DEFAULT 5 NOT NULL,
	"default_sale_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"description" text,
	"embedding" "vector(1536)",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(100),
	"supplier_id" integer,
	"source" varchar(50) DEFAULT 'Wholesale Shop' NOT NULL,
	"procurement_date" timestamp DEFAULT now() NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"procurement_id" integer,
	"supplier_id" integer,
	"batch_number" varchar(100),
	"source" varchar(50) DEFAULT 'Wholesale Shop' NOT NULL,
	"procurement_date" timestamp DEFAULT now() NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"initial_qty" integer NOT NULL,
	"remaining_qty" integer NOT NULL,
	"expiry_date" timestamp,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"customer_id" integer,
	"salesperson_id" integer,
	"sale_date" timestamp DEFAULT now() NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_cogs" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"net_profit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'CASH' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_sale_price" numeric(12, 2) NOT NULL,
	"subtotal_revenue" numeric(12, 2) NOT NULL,
	"subtotal_cogs" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"subtotal_profit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"allocation_type" varchar(50) DEFAULT 'AUTO_LOWEST_COST' NOT NULL,
	"selected_lot_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sale_item_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_item_id" integer NOT NULL,
	"lot_id" integer NOT NULL,
	"allocated_qty" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"lot_revenue" numeric(12, 2) NOT NULL,
	"lot_cogs" numeric(12, 2) NOT NULL,
	"lot_profit" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lot_product_cost_idx" ON "inventory_lots" ("product_id","unit_cost","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lot_remaining_qty_idx" ON "inventory_lots" ("remaining_qty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_date_idx" ON "sales" ("sale_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_customer_idx" ON "sales" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_items_sale_idx" ON "sale_items" ("sale_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_items_product_idx" ON "sale_items" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sil_sale_item_idx" ON "sale_item_lots" ("sale_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sil_lot_idx" ON "sale_item_lots" ("lot_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procurements" ADD CONSTRAINT "procurements_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_procurement_id_procurements_id_fk" FOREIGN KEY ("procurement_id") REFERENCES "procurements"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_selected_lot_id_inventory_lots_id_fk" FOREIGN KEY ("selected_lot_id") REFERENCES "inventory_lots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_item_lots" ADD CONSTRAINT "sale_item_lots_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sale_item_lots" ADD CONSTRAINT "sale_item_lots_lot_id_inventory_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
