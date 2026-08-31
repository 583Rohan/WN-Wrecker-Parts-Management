using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WnWrecker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddConversationHandedOff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HandedOff",
                table: "Conversations",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HandedOff",
                table: "Conversations");
        }
    }
}
