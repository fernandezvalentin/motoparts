using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using InventarioApi.Data;
using InventarioApi.Repositories;
using InventarioApi.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuración de Base de Datos (PostgreSQL)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresConnection")));

// 2. Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirPanelAdmin", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3. Configuración de JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
{
    if (builder.Environment.IsProduction())
    {
        throw new Exception("CRITICAL ERROR: JWT Key is missing or too short. Set 'JWT_KEY' environment variable.");
    }
    jwtKey = "ClaveSuperSecretaParaDesarrolloQueTieneMasDe32Caracteres!";
}
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

// 4. Configuración de Inyección de Dependencias (S.O.L.I.D.)
builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
builder.Services.AddScoped<IVentaRepository, VentaRepository>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();

builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddScoped<IVentaService, VentaService>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddControllers()
    .AddJsonOptions(x =>
        x.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Manejo Global de Errores (debe ser el primer middleware)
app.UseMiddleware<InventarioApi.Middleware.ErrorHandlingMiddleware>();

// Configuración de Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 3. LA TUBERÍA DE EJECUCIÓN (El orden acá es vital)
// Comentamos esta línea para evitar que el navegador bloquee la redirección de HTTP a HTTPS
// app.UseHttpsRedirection(); 

app.UseCors("PermitirPanelAdmin"); 

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/api/ping", () => Results.Ok(new { status = "awake", timestamp = DateTime.UtcNow }));

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
}

app.Run();