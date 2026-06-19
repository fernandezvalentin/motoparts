using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using InventarioApi.Models;
using InventarioApi.Services;

namespace InventarioApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);

            if (result == null)
            {
                return Unauthorized(new { message = "Usuario o contraseña incorrectos." });
            }

            return Ok(new { token = result.Value.Token, username = result.Value.Username });
        }

        [Authorize]
        [HttpPut("actualizar")]
        public async Task<IActionResult> ActualizarCredenciales(UpdateCredentialsDto request)
        {
            var currentUsername = User.Identity?.Name;
            
            if (string.IsNullOrEmpty(currentUsername))
            {
                return Unauthorized();
            }

            var success = await _authService.ActualizarCredencialesAsync(currentUsername, request);

            if (!success)
            {
                return NotFound(new { message = "Usuario no encontrado." });
            }

            return Ok(new { message = "Credenciales actualizadas correctamente." });
        }
    }
}
