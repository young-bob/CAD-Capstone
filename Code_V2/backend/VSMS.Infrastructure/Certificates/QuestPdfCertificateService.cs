using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Certificates;

public class QuestPdfCertificateService : ICertificateService
{
    private static readonly HttpClient QrHttpClient = new();

    static QuestPdfCertificateService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> GeneratePdfAsync(CertificateData data, CertificateTemplateInfo template)
    {
        if (template.TemplateType == CertificateTemplateTypes.HoursLog)
            return await GenerateHoursLogPdfAsync(data, template);

        var titleText = template.TitleText ?? "Certificate of Volunteer Service";
        var bodyText = BuildBodyText(data, template);
        var volunteerSignature = string.IsNullOrWhiteSpace(data.VolunteerSignatureName) ? null : data.VolunteerSignatureName;
        var qrCodeBytes = await TryGetQrCodeBytesAsync(data.VerificationUrl);

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(0);

                page.Content().Element(c =>
                {
                    // Outer border with accent color
                    c.Border(4).BorderColor(template.AccentColor).Padding(12)
                     .Border(1).BorderColor(template.PrimaryColor).Padding(30)
                     .Column(col =>
                     {
                         col.Spacing(10);

                         // Logo (if provided)
                         if (template.LogoBytes is { Length: > 0 })
                         {
                             col.Item().AlignCenter().Height(60).Image(template.LogoBytes).FitHeight();
                         }

                         // Decorative line
                         col.Item().PaddingVertical(5).LineHorizontal(2).LineColor(template.AccentColor);

                         // Title
                         col.Item().AlignCenter()
                            .Text(titleText)
                            .FontSize(32).Bold().FontColor(template.PrimaryColor);

                         // Subtitle
                         col.Item().AlignCenter()
                            .Text("This certificate is proudly presented to")
                            .FontSize(14).FontColor(Colors.Grey.Medium);

                         // Volunteer Name
                         col.Item().PaddingVertical(8).AlignCenter()
                            .Text(data.VolunteerName)
                            .FontSize(28).Bold().Italic().FontColor(template.AccentColor);

                         // Decorative line
                         col.Item().PaddingHorizontal(120).LineHorizontal(1).LineColor(template.AccentColor);

                         // Body text
                         col.Item().PaddingVertical(8).PaddingHorizontal(60).AlignCenter()
                            .Text(bodyText)
                            .FontSize(13).FontColor(Colors.Grey.Darken3).LineHeight(1.6f);

                         // Spacer
                         col.Item().MinHeight(20);

                         // Footer row: Date + Signatory
                         col.Item().Row(row =>
                         {
                             // Date
                             row.RelativeItem().AlignCenter().Column(dateCol =>
                             {
                                 dateCol.Item().AlignCenter().LineHorizontal(1).LineColor(Colors.Grey.Medium);
                                 dateCol.Item().AlignCenter().PaddingTop(4)
                                    .Text(DateTime.UtcNow.ToString("MMMM dd, yyyy"))
                                    .FontSize(11).FontColor(Colors.Grey.Darken1);
                                 dateCol.Item().AlignCenter()
                                    .Text("Date Issued")
                                    .FontSize(9).FontColor(Colors.Grey.Medium);
                             });

                             row.ConstantItem(80); // spacer

                             // Signatory
                             row.RelativeItem().AlignCenter().Column(sigCol =>
                             {
                                 sigCol.Item().AlignCenter().LineHorizontal(1).LineColor(Colors.Grey.Medium);
                                 if (!string.IsNullOrWhiteSpace(volunteerSignature))
                                 {
                                     sigCol.Item().AlignCenter().Text(volunteerSignature)
                                        .FontSize(18).Italic().FontColor(template.AccentColor);
                                 }
                                 sigCol.Item().AlignCenter().PaddingTop(4)
                                    .Text(template.SignatoryName ?? "Program Director")
                                    .FontSize(11).FontColor(Colors.Grey.Darken1);
                                 sigCol.Item().AlignCenter()
                                     .Text(template.SignatoryTitle ?? "Authorized Signatory")
                                     .FontSize(9).FontColor(Colors.Grey.Medium);
                             });
                         });

                         AddVerificationBlock(col, data, qrCodeBytes);
                     });
                });
            });
        });

        return doc.GeneratePdf();
    }

    private static async Task<byte[]> GenerateHoursLogPdfAsync(CertificateData data, CertificateTemplateInfo template)
    {
        var titleText = template.TitleText ?? "Community Involvement Hours Log";
        var today = DateTime.UtcNow.ToString("MMMM dd, yyyy");
        var signatoryName = string.IsNullOrWhiteSpace(template.SignatoryName)
            ? data.OrganizationName ?? "Authorized Organization Representative"
            : template.SignatoryName;
        var signatoryTitle = string.IsNullOrWhiteSpace(template.SignatoryTitle)
            ? "Authorized Organization Representative"
            : template.SignatoryTitle;
        var volunteerSignature = string.IsNullOrWhiteSpace(data.VolunteerSignatureName) ? null : data.VolunteerSignatureName;
        var qrCodeBytes = await TryGetQrCodeBytesAsync(data.VerificationUrl);

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Content().Column(col =>
                {
                    col.Spacing(12);

                    col.Item().Background(template.PrimaryColor).Padding(16).Column(header =>
                    {
                        header.Item().Text(titleText).FontSize(20).Bold().FontColor(Colors.White);
                        header.Item().PaddingTop(4).Text("Verified volunteer activity summary").FontSize(10).FontColor(Colors.White);
                    });

                    col.Item().Border(1).BorderColor(Colors.Grey.Lighten1).Padding(12).Row(info =>
                    {
                        info.RelativeItem().Column(left =>
                        {
                            left.Item().Text($"Volunteer: {data.VolunteerName}").Bold();
                            left.Item().Text($"Organization: {data.OrganizationName ?? "Community Organization"}");
                        });

                        info.RelativeItem().Column(right =>
                        {
                            right.Item().AlignRight().Text($"Issued: {today}");
                            right.Item().AlignRight().Text($"Total Hours: {data.TotalHours:F1}");
                        });
                    });

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellHeader).Text("Activity");
                            header.Cell().Element(CellHeader).Text("Organization");
                            header.Cell().Element(CellHeader).Text("Completed");
                            header.Cell().Element(CellHeader).AlignRight().Text("Hours");
                        });

                        if (data.Activities.Count == 0)
                        {
                            table.Cell().ColumnSpan(4).Element(CellBody).Text("No verified activities recorded yet.");
                        }
                        else
                        {
                            foreach (var activity in data.Activities)
                            {
                                table.Cell().Element(CellBody).Text(activity.Title);
                                table.Cell().Element(CellBody).Text(string.IsNullOrWhiteSpace(activity.OrganizationName) ? data.OrganizationName ?? "-" : activity.OrganizationName);
                                table.Cell().Element(CellBody).Text(activity.CompletedAt?.ToString("yyyy-MM-dd") ?? "-");
                                table.Cell().Element(CellBody).AlignRight().Text($"{activity.Hours:F1}");
                            }
                        }

                        table.Cell().ColumnSpan(3).Element(CellTotal).AlignRight().Text("Total Hours");
                        table.Cell().Element(CellTotal).AlignRight().Text($"{data.TotalHours:F1}");
                    });

                    col.Item().PaddingTop(8)
                        .Text("This log was generated from verified participation records in VSMS. School-specific approval or signature fields can be completed manually if required.")
                        .FontSize(9).FontColor(Colors.Grey.Darken1);

                    col.Item().PaddingTop(24).Row(row =>
                    {
                        row.RelativeItem().Column(sig =>
                        {
                            sig.Item().Height(24);
                            sig.Item().LineHorizontal(1);
                            if (!string.IsNullOrWhiteSpace(volunteerSignature))
                            {
                                sig.Item().PaddingTop(4).Text(volunteerSignature).FontSize(16).Italic().FontColor(template.AccentColor);
                            }
                            sig.Item().PaddingTop(4).Text("Volunteer Signature").FontSize(9).FontColor(Colors.Grey.Medium);
                        });
                        row.ConstantItem(30);
                        row.RelativeItem().Column(sig =>
                        {
                            sig.Item().Height(24);
                            sig.Item().LineHorizontal(1);
                            sig.Item().PaddingTop(4).Text(signatoryName).FontSize(9).FontColor(Colors.Grey.Darken1);
                            sig.Item().Text(signatoryTitle).FontSize(8).FontColor(Colors.Grey.Medium);
                        });
                    });

                    AddVerificationBlock(col, data, qrCodeBytes);
                });
            });
        });

        return doc.GeneratePdf();
    }

    private static IContainer CellHeader(IContainer container) =>
        container.Background(Colors.Grey.Darken2).PaddingVertical(6).PaddingHorizontal(8).DefaultTextStyle(x => x.FontColor(Colors.White).Bold().FontSize(10));

    private static IContainer CellBody(IContainer container) =>
        container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(6).PaddingHorizontal(8);

    private static IContainer CellTotal(IContainer container) =>
        container.Background(Colors.Grey.Lighten3).PaddingVertical(7).PaddingHorizontal(8).DefaultTextStyle(x => x.Bold());

    private static void AddVerificationBlock(ColumnDescriptor col, CertificateData data, byte[]? qrCodeBytes)
    {
        if (string.IsNullOrWhiteSpace(data.CertificateId) && string.IsNullOrWhiteSpace(data.VerificationUrl))
            return;

        col.Item().PaddingTop(10).AlignCenter().Row(row =>
        {
            if (qrCodeBytes is { Length: > 0 })
            {
                row.ConstantItem(80).Height(80).Image(qrCodeBytes);
                row.ConstantItem(16);
            }

            row.RelativeItem().Column(info =>
            {
                info.Item().Text("Scan to verify").FontSize(10).SemiBold().FontColor(Colors.Grey.Darken2);

                if (!string.IsNullOrWhiteSpace(data.CertificateId))
                {
                    info.Item().Text($"Certificate ID: {data.CertificateId}")
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                }

                if (!string.IsNullOrWhiteSpace(data.VerificationUrl))
                {
                    info.Item().Text($"Verify: {data.VerificationUrl}")
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                }
            });
        });
    }

    private static async Task<byte[]?> TryGetQrCodeBytesAsync(string? verificationUrl)
    {
        if (string.IsNullOrWhiteSpace(verificationUrl))
            return null;

        try
        {
            var qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data={Uri.EscapeDataString(verificationUrl)}";
            return await QrHttpClient.GetByteArrayAsync(qrUrl);
        }
        catch
        {
            return null;
        }
    }

    private static string BuildBodyText(CertificateData data, CertificateTemplateInfo template)
    {
        if (!string.IsNullOrEmpty(template.BodyTemplate))
        {
            return template.BodyTemplate
                .Replace("{{VolunteerName}}", data.VolunteerName)
                .Replace("{{TotalHours}}", data.TotalHours.ToString("F1"))
                .Replace("{{OpportunityCount}}", data.CompletedOpportunities.ToString())
                .Replace("{{OrganizationName}}", data.OrganizationName ?? "our organization")
                .Replace("{{Date}}", DateTime.UtcNow.ToString("MMMM dd, yyyy"));
        }

        var orgPhrase = string.IsNullOrEmpty(data.OrganizationName)
            ? ""
            : $" with {data.OrganizationName}";

        return $"In recognition of outstanding dedication and service{orgPhrase}, " +
               $"having successfully contributed {data.TotalHours:F1} volunteer hours " +
               $"across {data.CompletedOpportunities} completed opportunities. " +
               $"Your commitment to making a positive impact is truly commendable.";
    }
}
