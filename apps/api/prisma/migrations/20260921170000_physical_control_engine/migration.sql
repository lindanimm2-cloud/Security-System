-- CreateEnum
CREATE TYPE "AccessPointKind" AS ENUM ('VEHICLE_GATE', 'PEDESTRIAN_GATE', 'DOOR', 'BARRIER', 'PARKING_GATE');
CREATE TYPE "AccessPointState" AS ENUM ('CLOSED', 'OPEN', 'LOCKED', 'UNLOCKED', 'MOVING', 'FORCED', 'HELD_OPEN', 'OFFLINE', 'UNKNOWN');
CREATE TYPE "AccessPointHealth" AS ENUM ('HEALTHY', 'DEGRADED', 'OFFLINE');
CREATE TYPE "AccessCommandType" AS ENUM ('OPEN', 'CLOSE', 'HOLD_OPEN', 'UNLOCK', 'LOCK', 'EMERGENCY_RELEASE');
CREATE TYPE "AccessCommandPhase" AS ENUM ('SENT', 'ACKNOWLEDGED', 'MOVING', 'SUCCEEDED', 'FAILED', 'TIMEOUT');

-- CreateTable
CREATE TABLE "access_points" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AccessPointKind" NOT NULL DEFAULT 'VEHICLE_GATE',
    "state" "AccessPointState" NOT NULL DEFAULT 'CLOSED',
    "health" "AccessPointHealth" NOT NULL DEFAULT 'HEALTHY',
    "controller_online" BOOLEAN NOT NULL DEFAULT true,
    "network_online" BOOLEAN NOT NULL DEFAULT true,
    "power_online" BOOLEAN NOT NULL DEFAULT true,
    "sensor_normal" BOOLEAN NOT NULL DEFAULT true,
    "motor_normal" BOOLEAN NOT NULL DEFAULT true,
    "camera_id" UUID,
    "external_ref" TEXT,
    "adapter" TEXT NOT NULL DEFAULT 'generic',
    "last_event" TEXT,
    "last_event_at" TIMESTAMP(3),
    "last_command_at" TIMESTAMP(3),
    "open_since" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_points_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_commands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "access_point_id" UUID NOT NULL,
    "command" "AccessCommandType" NOT NULL,
    "phase" "AccessCommandPhase" NOT NULL DEFAULT 'SENT',
    "actor_user_id" UUID,
    "actor_name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'control-room',
    "confirmed_clear" BOOLEAN NOT NULL DEFAULT false,
    "result_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "access_commands_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "access_points_tenant_id_property_id_idx" ON "access_points"("tenant_id", "property_id");
CREATE INDEX "access_points_property_id_idx" ON "access_points"("property_id");
CREATE INDEX "access_points_tenant_id_state_idx" ON "access_points"("tenant_id", "state");
CREATE INDEX "access_commands_tenant_id_created_at_idx" ON "access_commands"("tenant_id", "created_at");
CREATE INDEX "access_commands_access_point_id_created_at_idx" ON "access_commands"("access_point_id", "created_at");

ALTER TABLE "access_points" ADD CONSTRAINT "access_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_points" ADD CONSTRAINT "access_points_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_points" ADD CONSTRAINT "access_points_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_commands" ADD CONSTRAINT "access_commands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_commands" ADD CONSTRAINT "access_commands_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "access_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
