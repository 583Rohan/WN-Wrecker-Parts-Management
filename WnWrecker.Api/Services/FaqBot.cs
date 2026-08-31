namespace WnWrecker.Api.Services;

public enum BotAction { Answer, Options, Handoff }

public record BotResult(BotAction Action, string Text, string[] Options);

public record FaqEntry(string Question, string[] Keywords, string Answer);

public static class FaqBot
{
    public const string Hours = "Our hours are Mon–Fri 8am–5pm and Sat 9am–1pm.";

    private static readonly string[] Greetings = { "hi", "hello", "hey", "good morning", "good afternoon" };
    private static readonly string[] Acknowledgements =
        { "ok", "okay", "thanks", "thank you", "cheers", "cool", "great", "alright", "got it", "no worries" };

    // phrases that always go to a human (availability, price, purchase intent)
    private static readonly string[] HandoffTriggers =
        { "available", "in stock", "still have", "still got", "buy this", "want this",
          "want to buy", "how much", "price", "reserve", "hold it", "purchase this" };

    private static readonly FaqEntry[] Faqs = new[]
    {
        new FaqEntry("What are your opening hours?",
            new[] { "hour", "open", "close", "time" },
            "We're open Mon–Fri 8am–5pm and Sat 9am–1pm. Closed Sundays and public holidays."),
        new FaqEntry("Where are you located?",
            new[] { "where", "location", "address", "located" },
            "We're located at [ADDRESS]. Ask us for directions any time!"),
        new FaqEntry("Do you deliver or ship parts?",
            new[] { "deliver", "delivery", "ship", "post", "freight" },
            "Yes, we can arrange delivery for most parts. Cost depends on size and your postcode."),
        new FaqEntry("How can I pay?",
            new[] { "pay", "payment", "card", "cash", "eftpos" },
            "We accept cash, EFTPOS, and bank transfer, arranged once you confirm a part with our team."),
        new FaqEntry("Do parts come with a warranty?",
            new[] { "warranty", "guarantee", "return", "refund" },
            "Most parts come with a limited warranty. Terms vary by part, so ask us about the specific item."),
    };

    public static string[] SuggestedQuestions => Faqs.Select(f => f.Question).ToArray();

    private static readonly string HandoffMessage =
        $"Thanks! I've passed this to our team — please hold tight and they'll reply as soon as they can. {Hours}";
    private static readonly string NoMatchMessage =
        "I'm not sure I got that — try rephrasing, tap a suggested question with the ? button, or press \"Talk to a human\" and our team will help.";
    public static string HumanRequestedMessage =>
        $"You're now connected to our team. We'll reply as soon as we can. {Hours}";

    public static BotResult Evaluate(string message)
    {
        var text = (message ?? "").Trim().ToLowerInvariant();

        // greeting -> friendly, no handoff
        if (Greetings.Any(g => text == g || text.StartsWith(g + " ")))
            return new BotResult(BotAction.Answer, "Hi there! How can we help? Ask a question, or tap one of the suggestions.", Array.Empty<string>());

        // acknowledgement -> friendly, no handoff
        if (Acknowledgements.Any(a => text == a))
            return new BotResult(BotAction.Answer, "No worries! Let us know if there's anything else.", Array.Empty<string>());

        // availability / purchase intent -> straight to a human
        if (HandoffTriggers.Any(t => text.Contains(t)))
            return new BotResult(BotAction.Handoff, HandoffMessage, Array.Empty<string>());

        // score the FAQs
        var matches = Faqs
            .Select(f => new { f, score = f.Keywords.Count(k => text.Contains(k)) })
            .Where(x => x.score > 0)
            .OrderByDescending(x => x.score)
            .ToList();

        // no match -> nudge to rephrase / escalate, but DON'T hand off
        if (matches.Count == 0)
            return new BotResult(BotAction.Answer, NoMatchMessage, Array.Empty<string>());

        // one clear top match -> answer it
        if (matches.Count == 1 || matches[0].score > matches[1].score)
            return new BotResult(BotAction.Answer, matches[0].f.Answer, Array.Empty<string>());

        // several equally-likely -> offer options
        var options = matches.Where(x => x.score == matches[0].score)
                             .Select(x => x.f.Question).ToArray();
        return new BotResult(BotAction.Options,
            "I'm not sure which you mean — did you want to know about:", options);
    }
}