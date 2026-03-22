using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMS.Infrastructure.Data.EfCoreQuery.Migrations
{
    /// <inheritdoc />
    public partial class AddVolunteerFollowTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VolunteerFollows",
                columns: table => new
                {
                    VolunteerGrainId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrgId = table.Column<Guid>(type: "uuid", nullable: false),
                    FollowedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VolunteerFollows", x => new { x.VolunteerGrainId, x.OrgId });
                });

            migrationBuilder.CreateIndex(
                name: "IX_VolunteerFollows_OrgId",
                table: "VolunteerFollows",
                column: "OrgId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VolunteerFollows");
        }
    }
}
