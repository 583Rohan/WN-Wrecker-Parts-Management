using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WnWrecker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "Invoices");
        }
    }
}
