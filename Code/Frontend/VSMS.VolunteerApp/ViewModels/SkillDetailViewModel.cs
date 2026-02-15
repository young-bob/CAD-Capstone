using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.ViewModels;

[QueryProperty(nameof(SkillId), "SkillId")]
public partial class SkillDetailViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;

    [ObservableProperty] string skillId = string.Empty;
    [ObservableProperty] Skill? skill;

    public ObservableCollection<VolunteerProfile> Volunteers { get; } = new();
    public ObservableCollection<OpportunityDetails> Opportunities { get; } = new();

    public SkillDetailViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Skill Details";
    }

    partial void OnSkillIdChanged(string value)
    {
        if (Guid.TryParse(value, out _))
            LoadCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadAsync()
    {
        if (IsBusy || !Guid.TryParse(SkillId, out var id)) return;
        IsBusy = true;
        try
        {
            Skill = await _apiService.GetSkill(id);

            var vols = await _apiService.GetVolunteersBySkill(id);
            Volunteers.Clear();
            foreach (var v in vols) Volunteers.Add(v);

            var opps = await _apiService.GetOpportunitiesBySkill(id);
            Opportunities.Clear();
            foreach (var o in opps) Opportunities.Add(o);
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }
}
