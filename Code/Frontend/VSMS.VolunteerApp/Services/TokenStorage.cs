namespace VSMS.VolunteerApp.Services;

/// <summary>
/// Token storage helper that uses SecureStorage when available,
/// falling back to Preferences on platforms where Keychain entitlements
/// are not configured (e.g., Mac Catalyst debug builds).
/// </summary>
public static class TokenStorage
{
    public static async Task SetAsync(string key, string value)
    {
        try
        {
            await SecureStorage.Default.SetAsync(key, value);
        }
        catch (Exception)
        {
            // Fallback for Mac Catalyst without provisioning profile
            Preferences.Default.Set(key, value);
        }
    }

    public static async Task<string?> GetAsync(string key)
    {
        try
        {
            var result = await SecureStorage.Default.GetAsync(key);
            if (!string.IsNullOrEmpty(result))
                return result;
        }
        catch (Exception)
        {
            // SecureStorage not available
        }

        // Fallback: also check Preferences (value may have been stored there)
        var prefValue = Preferences.Default.Get(key, string.Empty);
        return string.IsNullOrEmpty(prefValue) ? null : prefValue;
    }

    public static void Remove(string key)
    {
        try
        {
            SecureStorage.Default.Remove(key);
        }
        catch (Exception)
        {
            // ignore
        }
        Preferences.Default.Remove(key);
    }
}
