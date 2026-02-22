using Moq;
using VSMS.VolunteerApp.Models;
using VSMS.VolunteerApp.Services;

namespace VSMS.VolunteerApp.Tests;

/// <summary>
/// Tests for BaseViewModel property and state behavior.
/// </summary>
public class BaseViewModelTests
{
    private class TestViewModel : ViewModels.BaseViewModel { }

    [Fact]
    public void IsBusy_DefaultIsFalse()
    {
        var vm = new TestViewModel();
        Assert.False(vm.IsBusy);
    }

    [Fact]
    public void IsNotBusy_InvertsIsBusy()
    {
        var vm = new TestViewModel();
        Assert.True(vm.IsNotBusy);

        vm.IsBusy = true;
        Assert.False(vm.IsNotBusy);
    }

    [Fact]
    public void IsBusy_RaisesPropertyChanged()
    {
        var vm = new TestViewModel();
        var changed = new List<string?>();
        vm.PropertyChanged += (_, e) => changed.Add(e.PropertyName);

        vm.IsBusy = true;

        Assert.Contains("IsBusy", changed);
        Assert.Contains("IsNotBusy", changed);
    }

    [Fact]
    public void Title_DefaultIsEmpty()
    {
        var vm = new TestViewModel();
        Assert.Equal(string.Empty, vm.Title);
    }

    [Fact]
    public void Title_RaisesPropertyChanged()
    {
        var vm = new TestViewModel();
        var changed = false;
        vm.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == "Title") changed = true;
        };

        vm.Title = "Test";
        Assert.True(changed);
    }
}
