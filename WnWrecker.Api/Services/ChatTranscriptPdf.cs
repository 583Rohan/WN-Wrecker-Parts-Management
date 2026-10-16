using QuestPDF.Fluent;
using QuestPDF.Helpers;
using WnWrecker.Api.Models;

namespace WnWrecker.Api.Services
{
    // The "whole chat as a record" PDF. Business details come from the "Business" section of appsettings.json.
    public static class ChatTranscriptPdf
    {
        public static byte[] Generate(Conversation c, IConfiguration biz)
        {
            string Get(string key, string fallback) =>
                string.IsNullOrWhiteSpace(biz[key]) ? fallback : biz[key]!;

            var bizName = Get("Name", "WN Wrecker");
            var bizPhone = Get("Phone", "[phone]");
            var bizEmail = Get("Email", "[email]");

            string SenderLabel(Message m) => m.Sender switch
            {
                "customer" => string.IsNullOrWhiteSpace(c.CustomerName) ? "You" : c.CustomerName!,
                "admin" => bizName,
                "bot" => $"{bizName} assistant",
                _ => "",
            };

            var messages = c.Messages.OrderBy(m => m.SentAt).ThenBy(m => m.Id).ToList();

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
                            col.Item().Text(bizName).FontSize(18).Bold().FontColor("#0D1930");
                            col.Item().Text($"Phone: {bizPhone}   Email: {bizEmail}").FontSize(9).FontColor("#64748B");
                        });
                        row.ConstantItem(200).Column(col =>
                        {
                            col.Item().AlignRight().Text("CHAT TRANSCRIPT").FontSize(14).Bold().FontColor("#F7A411");
                            col.Item().AlignRight().Text($"Reference {c.ReferenceCode}").FontSize(10).Bold();
                            col.Item().AlignRight().Text($"Started {c.CreatedAt.ToLocalTime():dd MMM yyyy, h:mm tt}").FontSize(9).FontColor("#64748B");
                            if (c.Archived && c.ClosedAt.HasValue)
                                col.Item().AlignRight().Text($"Closed {c.ClosedAt.Value.ToLocalTime():dd MMM yyyy, h:mm tt}").FontSize(9).FontColor("#64748B");
                        });
                    });

                    page.Content().PaddingVertical(16).Column(col =>
                    {
                        if (!string.IsNullOrWhiteSpace(c.CustomerName) || !string.IsNullOrWhiteSpace(c.CustomerContact))
                        {
                            col.Item().PaddingBottom(12).Column(cust =>
                            {
                                cust.Item().Text("CUSTOMER").FontSize(9).Bold().FontColor("#64748B");
                                if (!string.IsNullOrWhiteSpace(c.CustomerName)) cust.Item().Text(c.CustomerName!).Bold();
                                if (!string.IsNullOrWhiteSpace(c.CustomerContact)) cust.Item().Text(c.CustomerContact!).FontSize(9).FontColor("#64748B");
                            });
                        }

                        var parts = c.Parts.Where(p => p.Part != null).ToList();
                        if (parts.Count > 0)
                        {
                            col.Item().PaddingBottom(12).Column(pp =>
                            {
                                pp.Item().Text("PARTS DISCUSSED").FontSize(9).Bold().FontColor("#64748B");
                                foreach (var p in parts)
                                    pp.Item().Text($"• {p.Part!.Name} — {p.Part.Make} {p.Part.Model} {p.Part.Year}").FontSize(9);
                            });
                        }

                        col.Item().LineHorizontal(1).LineColor("#E2E8F0");

                        foreach (var m in messages)
                        {
                            if (m.Sender == "system")
                            {
                                col.Item().PaddingVertical(6).AlignCenter()
                                    .Text($"— {m.Text} ({m.SentAt.ToLocalTime():dd MMM, h:mm tt}) —").FontSize(8).Italic().FontColor("#94A3B8");
                                continue;
                            }

                            var text = m.Kind == "invoice" && m.Invoice != null
                                ? $"Sent invoice {m.Invoice.Number} — {ChatInfo.Money(m.Invoice.Total)} (incl. GST)"
                                : m.Text;

                            col.Item().PaddingTop(8).Column(msg =>
                            {
                                msg.Item().Text(t =>
                                {
                                    t.Span(SenderLabel(m)).Bold().FontSize(9)
                                        .FontColor(m.Sender == "customer" ? "#0D1930" : "#B87100");
                                    t.Span($"   {m.SentAt.ToLocalTime():dd MMM, h:mm tt}").FontSize(8).FontColor("#94A3B8");
                                });
                                msg.Item().PaddingTop(2).Text(text).FontSize(10);
                            });
                        }

                        if (messages.Count == 0)
                            col.Item().PaddingTop(10).Text("No messages yet.").FontColor("#94A3B8");
                    });

                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span($"{bizName} · Reference {c.ReferenceCode} · Page ").FontSize(8).FontColor("#94A3B8");
                        x.CurrentPageNumber().FontSize(8).FontColor("#94A3B8");
                        x.Span(" of ").FontSize(8).FontColor("#94A3B8");
                        x.TotalPages().FontSize(8).FontColor("#94A3B8");
                    });
                });
            });

            return doc.GeneratePdf();
        }
    }
}
