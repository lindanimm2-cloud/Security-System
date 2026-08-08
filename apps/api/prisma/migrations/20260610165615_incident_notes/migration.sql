-- CreateTable
CREATE TABLE "incident_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "author_role" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_notes_incident_id_created_at_idx" ON "incident_notes"("incident_id", "created_at");

-- AddForeignKey
ALTER TABLE "incident_notes" ADD CONSTRAINT "incident_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_notes" ADD CONSTRAINT "incident_notes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
