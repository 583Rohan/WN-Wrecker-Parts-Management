using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WnWrecker.Api.Migrations
{
    /// <inheritdoc />
    public partial class ChatReferenceAndClosing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "InvoiceId",
                table: "Messages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Messages",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "text");

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAt",
                table: "Conversations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClosedBy",
                table: "Conversations",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferenceCode",
                table: "Conversations",
                type: "nvarchar(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TranscriptToken",
                table: "Conversations",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_InvoiceId",
                table: "Messages",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ReferenceCode",
                table: "Conversations",
                column: "ReferenceCode",
                unique: true,
                filter: "[ReferenceCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_TranscriptToken",
                table: "Conversations",
                column: "TranscriptToken");

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Invoices_InvoiceId",
                table: "Messages",
                column: "InvoiceId",
                principalTable: "Invoices",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Invoices_InvoiceId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_InvoiceId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_ReferenceCode",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_TranscriptToken",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "InvoiceId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ClosedAt",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "ClosedBy",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "ReferenceCode",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "TranscriptToken",
                table: "Conversations");
        }
    }
}
