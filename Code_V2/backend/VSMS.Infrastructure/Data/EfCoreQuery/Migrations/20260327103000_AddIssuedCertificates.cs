using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VSMS.Infrastructure.Data.EfCoreQuery;

#nullable disable

namespace VSMS.Infrastructure.Data.EfCoreQuery.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260327103000_AddIssuedCertificates")]
    public partial class AddIssuedCertificates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS "IssuedCertificates" (
                    "Id" uuid NOT NULL,
                    "CertificateId" character varying(40) NOT NULL,
                    "VolunteerId" uuid NOT NULL,
                    "OrganizationId" uuid NULL,
                    "TemplateId" uuid NOT NULL,
                    "VolunteerName" character varying(200) NOT NULL,
                    "OrganizationName" character varying(200),
                    "TemplateName" character varying(200) NOT NULL,
                    "TemplateType" character varying(50) NOT NULL,
                    "TotalHours" double precision NOT NULL,
                    "CompletedOpportunities" integer NOT NULL,
                    "VolunteerSignatureName" character varying(200),
                    "SignatoryName" character varying(200),
                    "SignatoryTitle" character varying(200),
                    "FileKey" character varying(500),
                    "FileName" character varying(260),
                    "IssuedAt" timestamp with time zone NOT NULL,
                    "IsRevoked" boolean NOT NULL,
                    "RevokedAt" timestamp with time zone NULL,
                    CONSTRAINT "PK_IssuedCertificates" PRIMARY KEY ("Id")
                );
                """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_IssuedCertificates_CertificateId"
                ON "IssuedCertificates" ("CertificateId");
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_IssuedCertificates_VolunteerId"
                ON "IssuedCertificates" ("VolunteerId");
                """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_IssuedCertificates_IssuedAt"
                ON "IssuedCertificates" ("IssuedAt");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS "IssuedCertificates";
                """);
        }
    }
}
