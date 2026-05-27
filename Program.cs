using Microsoft.EntityFrameworkCore;
using InventarioApi.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Le decimos a la API que vamos a usar Controladores
builder.Services.AddControllers(); 

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configuraciones por defecto para la documentación (Swagger)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 2. Configuramos la interfaz de Swagger para probar la API
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

// 3. Mapeamos las rutas hacia nuestra carpeta Controllers
app.MapControllers(); 

app.Run();