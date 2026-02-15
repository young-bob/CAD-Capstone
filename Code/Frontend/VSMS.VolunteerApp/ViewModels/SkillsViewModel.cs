using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;
using VSMS.VolunteerApp.Views;

namespace VSMS.VolunteerApp.ViewModels;

public partial class SkillsViewModel : BaseViewModel
{
    private readonly IVolunteerApiService _apiService;
    public ObservableCollection<Skill> Skills { get; } = new();

    [ObservableProperty] bool isAdding;
    [ObservableProperty] string newSkillName = string.Empty;
    [ObservableProperty] string newSkillDescription = string.Empty;

    public SkillsViewModel(IVolunteerApiService apiService)
    {
        _apiService = apiService;
        Title = "Skills";
        LoadCommand.Execute(null);
    }

    [RelayCommand]
    async Task LoadAsync()
    {
        if (IsBusy) return;
        IsBusy = true;
        try
        {
            var list = await _apiService.GetSkills();
            Skills.Clear();
            foreach (var s in list) Skills.Add(s);
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }

    [RelayCommand] void ShowAddForm() => IsAdding = true;
    [RelayCommand] void CancelAdd() => IsAdding = false;

    [RelayCommand]
    async Task AddSkillAsync()
    {
        if (IsBusy || string.IsNullOrWhiteSpace(NewSkillName)) return;
        IsBusy = true;
        try
        {
            var skill = new Skill(Guid.NewGuid(), NewSkillName, NewSkillDescription);
            await _apiService.CreateSkill(skill);
            IsAdding = false;
            NewSkillName = ""; NewSkillDescription = "";
            await LoadAsync();
        }
        catch (Exception ex) { await Shell.Current.DisplayAlertAsync("Error", ex.Message, "OK"); }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    async Task ViewDetailAsync(Skill skill)
    {
        if (skill == null) return;
        await Shell.Current.GoToAsync(nameof(SkillDetailPage), true, new Dictionary<string, object>
        {
            { "SkillId", skill.SkillId.ToString() }
        });
    }
}
