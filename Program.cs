using Microsoft.EntityFrameworkCore;
using InventarioApi.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Conexión a la base de datos SQLite
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

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

builder.Services.AddControllers()
    .AddJsonOptions(x =>
        x.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configuración de Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 3. LA TUBERÍA DE EJECUCIÓN (El orden acá es vital)
// Comentamos esta línea para evitar que el navegador bloquee la redirección de HTTP a HTTPS
// app.UseHttpsRedirection(); 

// CORS DEBE ir antes de Authorization y MapControllers
app.UseCors("PermitirPanelAdmin"); 

app.UseAuthorization();
app.MapControllers();

app.Run();