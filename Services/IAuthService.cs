using InventarioApi.Models;

namespace InventarioApi.Services
{
    public interface IAuthService
    {
        Task<(string Token, string Username)?> LoginAsync(LoginRequest request);
        Task<bool> ActualizarCredencialesAsync(string currentUsername, UpdateCredentialsDto request);
    }
}
