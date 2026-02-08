-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'MEMBER', 'DEPLOYER');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_user_id_workspace_id_key" ON "workspace_members"("user_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_token_idx" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_idx" ON "workspace_invitations"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_idx" ON "workspace_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_workspace_id_email_key" ON "workspace_invitations"("workspace_id", "email");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 1: Add workspace_id column to projects (nullable initially)
ALTER TABLE "projects" ADD COLUMN "workspace_id" TEXT;

-- Step 2: Create a personal workspace for each existing user and link their projects
-- This creates workspaces with slug based on user id to ensure uniqueness
DO $$
DECLARE
    user_record RECORD;
    new_workspace_id TEXT;
    new_workspace_slug TEXT;
    new_workspace_name TEXT;
BEGIN
    FOR user_record IN SELECT id, name, email FROM users LOOP
        -- Generate workspace ID
        new_workspace_id := gen_random_uuid()::TEXT;

        -- Generate unique slug from user id
        new_workspace_slug := 'personal-' || user_record.id;

        -- Generate workspace name
        IF user_record.name IS NOT NULL AND user_record.name != '' THEN
            new_workspace_name := user_record.name || '''s Workspace';
        ELSE
            new_workspace_name := split_part(user_record.email, '@', 1) || '''s Workspace';
        END IF;

        -- Create the workspace
        INSERT INTO workspaces (id, name, slug, created_at, updated_at)
        VALUES (new_workspace_id, new_workspace_name, new_workspace_slug, NOW(), NOW());

        -- Make user an ADMIN of their workspace
        INSERT INTO workspace_members (id, user_id, workspace_id, role, created_at, updated_at)
        VALUES (gen_random_uuid()::TEXT, user_record.id, new_workspace_id, 'ADMIN', NOW(), NOW());

        -- Link all user's projects to this workspace
        UPDATE projects SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
    END LOOP;
END $$;

-- Step 3: Make workspace_id NOT NULL now that all projects have been migrated
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Step 4: Drop old user_id foreign key and column from projects
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";

-- Drop the old unique constraint
DROP INDEX IF EXISTS "projects_user_id_slug_key";

-- Drop old indexes
DROP INDEX IF EXISTS "projects_user_id_idx";
DROP INDEX IF EXISTS "projects_user_id_status_idx";

-- Drop the column
ALTER TABLE "projects" DROP COLUMN "user_id";

-- Step 5: Add new constraints and indexes for workspace_id
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");
CREATE INDEX "projects_workspace_id_status_idx" ON "projects"("workspace_id", "status");
CREATE UNIQUE INDEX "projects_workspace_id_slug_key" ON "projects"("workspace_id", "slug");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Migrate subscriptions from user to workspace
-- Add workspace_id column to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "workspace_id" TEXT;

-- Link existing subscriptions to user's workspace
UPDATE subscriptions s
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE wm.user_id = s.user_id AND wm.role = 'ADMIN';

-- Drop old constraints
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_fkey";
DROP INDEX IF EXISTS "subscriptions_user_id_idx";

-- Drop old column
ALTER TABLE "subscriptions" DROP COLUMN "user_id";

-- Make workspace_id NOT NULL and UNIQUE (one subscription per workspace)
-- First delete any orphaned subscriptions (subscriptions without a workspace)
DELETE FROM subscriptions WHERE workspace_id IS NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_key" UNIQUE ("workspace_id");

-- Add new index and foreign key
CREATE INDEX "subscriptions_workspace_id_idx" ON "subscriptions"("workspace_id");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Migrate invoices from user to workspace
-- Add workspace_id column to invoices
ALTER TABLE "invoices" ADD COLUMN "workspace_id" TEXT;

-- Link existing invoices to user's workspace
UPDATE invoices i
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE wm.user_id = i.user_id AND wm.role = 'ADMIN';

-- Drop old constraints
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_user_id_fkey";
DROP INDEX IF EXISTS "invoices_user_id_idx";

-- Drop old column
ALTER TABLE "invoices" DROP COLUMN "user_id";

-- Make workspace_id NOT NULL
-- First delete any orphaned invoices
DELETE FROM invoices WHERE workspace_id IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Add new index and foreign key
CREATE INDEX "invoices_workspace_id_idx" ON "invoices"("workspace_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Migrate usage_records from user to workspace
-- Add workspace_id column to usage_records
ALTER TABLE "usage_records" ADD COLUMN "workspace_id" TEXT;

-- Link existing usage_records to user's workspace
UPDATE usage_records ur
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE wm.user_id = ur.user_id AND wm.role = 'ADMIN';

-- Drop old constraints
ALTER TABLE "usage_records" DROP CONSTRAINT IF EXISTS "usage_records_user_id_fkey";
DROP INDEX IF EXISTS "usage_records_user_id_billing_period_idx";

-- Drop old column
ALTER TABLE "usage_records" DROP COLUMN "user_id";

-- Make workspace_id NOT NULL
-- First delete any orphaned usage_records
DELETE FROM usage_records WHERE workspace_id IS NULL;
ALTER TABLE "usage_records" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Add new index and foreign key
CREATE INDEX "usage_records_workspace_id_billing_period_idx" ON "usage_records"("workspace_id", "billing_period");
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
