using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMS.Infrastructure.Data.EfCoreQuery.Migrations
{
    /// <inheritdoc />
    public partial class TemplateType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "CertificateTemplates"
                ADD COLUMN IF NOT EXISTS "TemplateType" character varying(50) NOT NULL DEFAULT '';
                """);

            migrationBuilder.Sql("""
                UPDATE "CertificateTemplates"
                SET "TemplateType" = 'achievement_certificate'
                WHERE "TemplateType" = '';
                """);

            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS "EventTasks" (
                    "Id" uuid NOT NULL,
                    "OpportunityId" uuid NOT NULL,
                    "OrganizationId" uuid NOT NULL,
                    "Title" character varying(200) NOT NULL,
                    "Note" character varying(1000),
                    "AssignedToGrainId" uuid,
                    "AssignedToEmail" character varying(256),
                    "AssignedToName" character varying(200),
                    "IsCompleted" boolean NOT NULL,
                    "CreatedByGrainId" uuid NOT NULL,
                    "CreatedByEmail" character varying(256),
                    "CreatedAt" timestamp with time zone NOT NULL,
                    "CompletedAt" timestamp with time zone,
                    CONSTRAINT "PK_EventTasks" PRIMARY KEY ("Id")
                );
                """);

            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS "Notifications" (
                    "Id" uuid NOT NULL,
                    "VolunteerGrainId" uuid NOT NULL,
                    "Title" text NOT NULL,
                    "Message" text NOT NULL,
                    "SenderName" text,
                    "SentAt" timestamp with time zone NOT NULL,
                    "IsRead" boolean NOT NULL,
                    CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id")
                );
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_EventTasks_OpportunityId"
                ON "EventTasks" ("OpportunityId");
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_EventTasks_OrganizationId"
                ON "EventTasks" ("OrganizationId");
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_Notifications_VolunteerGrainId_SentAt"
                ON "Notifications" ("VolunteerGrainId", "SentAt");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventTasks");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropColumn(
                name: "TemplateType",
                table: "CertificateTemplates");
        }
    }
}
