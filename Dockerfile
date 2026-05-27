FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["InventarioApi.csproj", "./"]
RUN dotnet restore "InventarioApi.csproj"
COPY . .
RUN dotnet build "InventarioApi.csproj" -c Release -o /app/build
RUN dotnet publish "InventarioApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "InventarioApi.dll"]
