using InventarioApi.Models;

namespace InventarioApi.Repositories
{
    public interface IUsuarioRepository
    {
        Task<Usuario?> GetByUsernameAsync(string username);
        void Update(Usuario usuario);
        Task SaveChangesAsync();
    }
}
