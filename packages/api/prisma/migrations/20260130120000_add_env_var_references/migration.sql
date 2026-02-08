-- AlterTable
ALTER TABLE "environment_variables" ADD COLUMN "is_shared" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "env_var_references" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "source_service_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "alias" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "env_var_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "env_var_references_service_id_idx" ON "env_var_references"("service_id");

-- CreateIndex
CREATE INDEX "env_var_references_source_service_id_idx" ON "env_var_references"("source_service_id");

-- CreateIndex
CREATE UNIQUE INDEX "env_var_references_service_id_source_service_id_key_key" ON "env_var_references"("service_id", "source_service_id", "key");

-- AddForeignKey
ALTER TABLE "env_var_references" ADD CONSTRAINT "env_var_references_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_var_references" ADD CONSTRAINT "env_var_references_source_service_id_fkey" FOREIGN KEY ("source_service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
