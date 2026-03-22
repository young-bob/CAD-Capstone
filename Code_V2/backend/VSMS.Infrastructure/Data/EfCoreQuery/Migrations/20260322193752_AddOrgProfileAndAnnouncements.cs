using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSMS.Infrastructure.Data.EfCoreQuery.Migrations
{
    /// <inheritdoc />
    public partial class AddOrgProfileAndAnnouncements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "OrganizationReadModels",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LatestAnnouncementAt",
                table: "OrganizationReadModels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LatestAnnouncementText",
                table: "OrganizationReadModels",
                type: "character varying(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "Tags",
                table: "OrganizationReadModels",
                type: "text[]",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "WebsiteUrl",
                table: "OrganizationReadModels",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "OrganizationReadModels");

            migrationBuilder.DropColumn(
                name: "LatestAnnouncementAt",
                table: "OrganizationReadModels");

            migrationBuilder.DropColumn(
                name: "LatestAnnouncementText",
                table: "OrganizationReadModels");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "OrganizationReadModels");

            migrationBuilder.DropColumn(
                name: "WebsiteUrl",
                table: "OrganizationReadModels");
        }
    }
}
