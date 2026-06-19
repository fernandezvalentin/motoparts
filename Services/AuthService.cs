using InventarioApi.Models;
using InventarioApi.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace InventarioApi.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IConfiguration _configuration;

        public AuthService(IUsuarioRepository usuarioRepository, IConfiguration configuration)
        {
            _usuarioRepository = usuarioRepository;
            _configuration = configuration;
        }

        public async Task<(string Token, string Username)?> LoginAsync(LoginRequest request)
        {
            var usuario = await _usuarioRepository.GetByUsernameAsync(request.Username);
            if (usuario == null)
            {
                return null;
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
            {
                return null;
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var keyStr = _configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            if (string.IsNullOrEmpty(keyStr) || keyStr.Length < 32)
            {
                var isProd = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
                if (isProd) 
                    throw new Exception("CRITICAL ERROR: JWT Key is missing or too short.");
                
                keyStr = "ClaveSuperSecretaParaDesarrolloQueTieneMasDe32Caracteres!";
            }
            
            var key = Encoding.UTF8.GetBytes(keyStr);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                    new Claim(ClaimTypes.Name, usuario.Username)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return (tokenString, usuario.Username);
        }

        public async Task<bool> ActualizarCredencialesAsync(string currentUsername, UpdateCredentialsDto request)
        {
            var usuario = await _usuarioRepository.GetByUsernameAsync(currentUsername);
            if (usuario == null)
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(request.NewUsername))
            {
                usuario.Username = request.NewUsername;
            }

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            }

            _usuarioRepository.Update(usuario);
            await _usuarioRepository.SaveChangesAsync();

            return true;
        }
    }
}
