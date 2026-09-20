CREATE TYPE "userRole" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "userDetails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" varchar(36) NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userDevices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" varchar(36) NOT NULL,
	"refreshToken" text,
	"lastUse" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"passwordHash" text,
	"role" "userRole" DEFAULT 'user'::"userRole",
	"isVerified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "userDetails" ADD CONSTRAINT "userDetails_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "userDevices" ADD CONSTRAINT "userDevices_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;