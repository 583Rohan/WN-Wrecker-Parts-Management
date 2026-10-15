using QuestPDF.Fluent;
using QuestPDF.Helpers;
using WnWrecker.Api.Models;

namespace WnWrecker.Api.Services
{
    public static class InvoicePdf
    {
        // Business details come from the "Business" section of appsettings.json (placeholders until the client confirms).
        public static byte[] Generate(Invoice inv, IConfiguration biz)
        {
            string Get(string key, string fallback) =>
                string.IsNullOrWhiteSpace(biz[key]) ? fallback : biz[key]!;

            var bizName = Get("Name", "WN Wrecker");
            var bizAbn = Get("Abn", "00 000 000 000");
            var bizAddress = Get("Address", "[Business address]");
            var bizPhone = Get("Phone", "[phone]");
            var bizEmail = Get("Email", "[email]");
            var paymentInfo = Get("PaymentInfo", "");
            var footer = Get("InvoiceFooter", $"Thank you for your business — {bizName}");

            // status stamp shown on the PDF
            var (stamp, stampColor) = inv.Status switch
            {
                InvoiceStatus.Paid => ("PAID", "#08733B"),
                InvoiceStatus.Void => ("VOID", "#B91C1C"),
                InvoiceStatus.Refunded => ("REFUNDED", "#B91C1C"),
                _ => ("UNPAID", "#B87100"),
            };

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
                            col.Item().Text(bizName).FontSize(20).Bold().FontColor("#0D1930");
                            col.Item().Text($"ABN {bizAbn}").FontSize(9).FontColor("#64748B");
                            col.Item().Text(bizAddress).FontSize(9).FontColor("#64748B");
                            col.Item().Text($"Phone: {bizPhone}   Email: {bizEmail}").FontSize(9).FontColor("#64748B");
                        });
                        row.ConstantItem(190).Column(col =>
                        {
                            col.Item().AlignRight().Text("TAX INVOICE").FontSize(16).Bold().FontColor("#F7A411");
                            col.Item().AlignRight().Text(inv.Number).FontSize(11).Bold();
                            if (!string.IsNullOrWhiteSpace(inv.Title))
                                col.Item().AlignRight().Text($"Ref: {inv.Title}").FontSize(9).FontColor("#64748B");
                            col.Item().AlignRight().Text($"Date: {inv.CreatedAt.ToLocalTime():dd MMM yyyy}").FontSize(9).FontColor("#64748B");
                            col.Item().AlignRight().PaddingTop(6).Text(stamp).FontSize(13).Bold().FontColor(stampColor);
                            if (inv.Status == InvoiceStatus.Paid && inv.PaidAt.HasValue)
                                col.Item().AlignRight().Text($"Paid {inv.PaidAt.Value.ToLocalTime():dd MMM yyyy}").FontSize(9).FontColor("#64748B");
                            if ((inv.Status == InvoiceStatus.Void || inv.Status == InvoiceStatus.Refunded) && inv.CancelledAt.HasValue)
                                col.Item().AlignRight().Text($"{(inv.Status == InvoiceStatus.Void ? "Voided" : "Refunded")} {inv.CancelledAt.Value.ToLocalTime():dd MMM yyyy}").FontSize(9).FontColor("#64748B");
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
                                header.Cell().Background("#0D1930").Padding(6).AlignRight().Text("Unit price").FontColor("#FFFFFF").Bold();
                                header.Cell().Background("#0D1930").Padding(6).AlignRight().Text("Amount").FontColor("#FFFFFF").Bold();
                            });

                            foreach (var item in inv.Items.OrderBy(i => i.Id))
                            {
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).Text(item.Description);
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).AlignRight().Text(item.Quantity.ToString());
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).AlignRight().Text($"${item.UnitPrice:N2}");
                                table.Cell().BorderBottom(1).BorderColor("#E2E8F0").Padding(6).AlignRight().Text($"${item.LineTotal:N2}");
                            }
                        });

                        col.Item().PaddingTop(12).AlignRight().Column(tot =>
                        {
                            tot.Item().AlignRight().Text($"Subtotal (excl. GST):  ${inv.Subtotal:N2}");
                            tot.Item().AlignRight().Text($"GST included:  ${inv.Gst:N2}");
                            tot.Item().AlignRight().PaddingTop(4).Text($"Total (incl. GST):  ${inv.Total:N2}").FontSize(13).Bold().FontColor("#0D1930");
                            if (inv.Status == InvoiceStatus.Unpaid)
                                tot.Item().AlignRight().Text($"Amount due:  ${inv.Total:N2}").FontSize(10).Bold().FontColor("#B87100");
                        });

                        if (!string.IsNullOrWhiteSpace(inv.Notes))
                            col.Item().PaddingTop(16).Column(n =>
                            {
                                n.Item().Text("NOTES").FontSize(9).Bold().FontColor("#64748B");
                                n.Item().Text(inv.Notes).FontSize(9).FontColor("#334155");
                            });

                        if (!string.IsNullOrWhiteSpace(paymentInfo) && inv.Status == InvoiceStatus.Unpaid)
                            col.Item().PaddingTop(12).Column(p =>
                            {
                                p.Item().Text("HOW TO PAY").FontSize(9).Bold().FontColor("#64748B");
                                p.Item().Text(paymentInfo).FontSize(9).FontColor("#334155");
                            });
                    });

                    page.Footer().AlignCenter().Text(footer).FontSize(9).FontColor("#94A3B8");
                });
            });

            return doc.GeneratePdf();
        }
    }
}