using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using VSMS.Abstractions.Services;

namespace VSMS.Infrastructure.Certificates;

public class QuestPdfCertificateService : ICertificateService
{
    static QuestPdfCertificateService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public Task<byte[]> GeneratePdfAsync(CertificateData data, CertificateTemplateInfo template)
    {
        var titleText = template.TitleText ?? "Certificate of Volunteer Service";
        var bodyText = BuildBodyText(data, template);

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
                                 sigCol.Item().AlignCenter().PaddingTop(4)
                                    .Text(template.SignatoryName ?? "Program Director")
                                    .FontSize(11).FontColor(Colors.Grey.Darken1);
                                 sigCol.Item().AlignCenter()
                                    .Text(template.SignatoryTitle ?? "Authorized Signatory")
                                    .FontSize(9).FontColor(Colors.Grey.Medium);
                             });
                         });
                     });
                });
            });
        });

        var bytes = doc.GeneratePdf();
        return Task.FromResult(bytes);
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
