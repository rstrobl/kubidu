/*
  Warnings:

  - You are about to drop the column `key_preview` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `accepted` on the `gdpr_consents` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `gdpr_consents` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_email_verified` on the `users` table. All the data in the column will be lost.
  - Added the required column `key_prefix` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consent_given` to the `gdpr_consents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consent_version` to the `gdpr_consents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan_name` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "key_preview",
ADD COLUMN     "key_prefix" TEXT NOT NULL,
ADD COLUMN     "permissions" TEXT[],
ADD COLUMN     "revoked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gdpr_consents" DROP COLUMN "accepted",
DROP COLUMN "version",
ADD COLUMN     "consent_given" BOOLEAN NOT NULL,
ADD COLUMN     "consent_version" TEXT NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan",
ADD COLUMN     "plan_name" TEXT NOT NULL,
ALTER COLUMN "stripe_customer_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "full_name",
DROP COLUMN "is_active",
DROP COLUMN "is_email_verified",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" TEXT;
