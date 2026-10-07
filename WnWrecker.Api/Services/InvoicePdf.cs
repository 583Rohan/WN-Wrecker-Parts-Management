using QuestPDF.Fluent;
using QuestPDF.Helpers;
using WnWrecker.Api.Models;

namespace WnWrecker.Api.Services
{
    public static class InvoicePdf
    {
        // ---- Edit these with the client's real details ----
        const string BizName = "WN Wrecker";
        const string BizAbn = "ABN 00 000 000 000";
        const string BizAddress = "[Business address]";
        const string BizContact = "Phone: [phone]   Email: [email]";

        public static byte[] Generate(Invoice inv)
        {
            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(40);
                    page.Size(PageSizes.A4);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor("#111827"));

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text(BizName).FontSize(20).Bold().FontColor("#0D1930");
                            col.Item().Text(BizAbn).FontSize(9).FontColor("#64748B");
                            col.Item().Text(BizAddress).FontSize(9).FontColor("#64748B");
                            col.Item().Text(BizContact).FontSize(9).FontColor("#64748B");
                        });
                        row.ConstantItem(180).Column(col =>
                        {
                            col.Item().AlignRight().Text("TAX INVOICE").FontSize(16).Bold().FontColor("#F7A411");
                            col.Item().AlignRight().Text(inv.Number).FontSize(11).Bold();
                            col.Item().AlignRight().Text($"Date: {inv.CreatedAt:dd MMM yyyy}").FontSize(9).FontColor("#64748B");
                        });
                    });

                    page.Content().PaddingVertical(16).Column(col =>
                    {
                        col.Item().PaddingBottom(10).Column(bill =>
                        {
                            bill.Item().Text("BILL TO").FontSize(9).Bold().FontColor("#64748B");
                            bill.Item().Text(inv.CustomerName).FontSize(11).Bold();
                            if (!string.IsNullOrWhiteSpace(inv.CustomerContact))
                                bill.Item().Text(inv.CustomerContact).FontSize(9).FontColor("#64748B");
                        });

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(5);
                                c.RelativeColumn(1);
                                c.RelativeColumn(2);
                                c.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background("#0D1930").Padding(6).Text("Description").FontColor("#FFFFFF").Bold();
                                header.Cell().Background("#0D1930").Padding(6).AlignRight().Text("Qty").FontColor("#FFFFFF").Bold();
                                header.Cell().Background("#0D1930").Padding(6).AlignRight().Text("Unit").FontColor("#FFFFFF").Bold();
                                header.Cell().Background("#0D1930").Padding(6).AlignRight().Text("Amount").FontColor("#FFFFFF").Bold();
                            });

                            foreach (var item in inv.Items)
                            {
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).Text(item.Description);
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).AlignRight().Text(item.Quantity.ToString());
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).AlignRight().Text($"${item.UnitPrice:N2}");
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).AlignRight().Text($"${item.LineTotal:N2}");
                            }
                        });

                        col.Item().PaddingTop(12).AlignRight().Column(tot =>
                        {
                            tot.Item().Text($"Subtotal:  ${inv.Subtotal:N2}");
                            tot.Item().Text($"GST (10%):  ${inv.Gst:N2}");
                            tot.Item().PaddingTop(4).Text($"Total:  ${inv.Total:N2}").FontSize(13).Bold().FontColor("#0D1930");
                        });

                        if (!string.IsNullOrWhiteSpace(inv.Notes))
                            col.Item().PaddingTop(16).Text(inv.Notes).FontSize(9).FontColor("#64748B");
                    });

                    page.Footer().AlignCenter().Text("Thank you for your business — WN Wrecker").FontSize(9).FontColor("#94A3B8");
                });
            });

            return doc.GeneratePdf();
        }
    }
}