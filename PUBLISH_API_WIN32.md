# Publishing SmartEduManager API for Win32 Standalone

This guide covers publishing the SmartEduManager .NET 10 Web API as a self-contained, 32-bit (win-x86) deployment for Windows Server hosting.

## Prerequisites

- .NET 10 SDK installed on build machine
- Windows Server (2016, 2019, 2022, or Windows 10/11) as target
- SQL Server database accessible from the server
- Administrator rights on the target server

## Step 1: Configure the Project File

Edit `SmartEduManager.Api\SmartEduManager.Api.csproj` and uncomment/update the publish properties inside `<PropertyGroup>`:

```xml
<PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
    <PublishSingleFile>false</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <RuntimeIdentifier>win-x86</RuntimeIdentifier>
    <PublishTrimmed>false</PublishTrimmed>
</PropertyGroup>
```

| Property | Value | Description |
|----------|-------|-------------|
| SelfContained | true | Includes the .NET runtime with the app (no runtime install needed on server) |
| RuntimeIdentifier | win-x86 | 32-bit Windows target |
| PublishTrimmed | false | Disables trimming to avoid breaking reflection-based code (Identity, EF Core, Serialization) |
| PublishSingleFile | false | Keeps individual DLLs (easier to debug; set to true for a single executable) |

## Step 2: Publish the API

Open PowerShell or Command Prompt in the project root and run:

```powershell
dotnet publish SmartEduManager.Api\SmartEduManager.Api.csproj `
  -c Release `
  -r win-x86 `
  --self-contained true `
  -o ./publish
```

### Expected Output

The publish folder will contain:
- `SmartEduManager.Api.exe` (main executable)
- `SmartEduManager.Api.dll`
- `appsettings.json`
- All required .NET runtime DLLs
- `SmartEduManager.Api.pdb` (debug symbols)

## Step 3: Deploy to Server

1. Copy the entire `./publish` folder to the target server (e.g., `C:\inetpub\SmartEduManager\` or `C:\SmartEduManager\Api\`).
2. Ensure the folder has read/execute permissions for the application pool identity or service user.
3. Update `appsettings.json` on the server with production values:

   - `ConnectionStrings:DefaultConnection` — point to your production SQL Server
   - `Jwt:Key` — use a strong, unique signing key
   - `AllowedHosts` — restrict to your domain(s)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=your-db-server;Database=SmartEduManager;User Id=sa;Password=your-password;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "your-32-char-plus-secret-key-here",
    "Issuer": "https://yourdomain.com",
    "Audience": "https://yourdomain.com"
  },
  "AllowedHosts": "yourdomain.com,www.yourdomain.com"
}
```

## Step 4: Run the API

### Option A: Run as a Standalone Executable (Manual/Test)

```powershell
cd C:\SmartEduManager\Api
& "C:\SmartEduManager\Api\SmartEduManager.Api.exe"
```

The API will listen on the URLs configured in `launchSettings.json` or `appsettings.json` (typically `http://localhost:5000` or `https://localhost:5001`).

### Option B: Run as a Windows Service (Recommended for Production)

1. Install NSSM (Non-Sucking Service Manager) or use Windows Service wrapper.
2. Create the service:

   ```powershell
   nssm install SmartEduManagerApi "C:\SmartEduManager\Api\SmartEduManager.Api.exe"
   nssm set SmartEduManagerApi Start SERVICE_AUTO_START
   nssm start SmartEduManagerApi
   ```

3. Or create a native Windows Service using `sc.exe`:

   ```powershell
   sc create SmartEduManagerApi binPath= "C:\SmartEduManager\Api\SmartEduManager.Api.exe" start= auto
   sc start SmartEduManagerApi
   ```

## Step 5: Configure Reverse Proxy (IIS / nginx / Apache)

### IIS Reverse Proxy

1. Install IIS with Application Request Routing (ARR) and URL Rewrite.
2. Create a website pointing to a blank folder.
3. Add `web.config` with reverse proxy rules:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="ReverseProxy" stopProcessing="true">
             <match url="(.*)" />
             <action type="Rewrite" url="http://127.0.0.1:5000/{R:1}" />
           </rule>
         </rules>
       </rewrite>
       <proxy enabled="true" preserveHeaders="true" reverseRewriteHostInResponseHeaders="false" />
     </system.webServer>
   </configuration>
   ```

4. Bind the site to your domain and port 80/443.

### nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Step 6: Database Migration (One-Time)

Run Entity Framework migrations on the production database:

```powershell
dotnet ef database update --project SmartEduManager.Api --startup-project SmartEduManager.Api
```

Or ensure the `RunSeedAfterPublish` target in `.csproj` executes during deployment.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| The library runtimepack not found | Ensure `--self-contained true` was used during publish |
| Port already in use | Change `ASPNETCORE_URLS` environment variable or edit `launchSettings.json` |
| Database connection failed | Verify SQL Server is reachable, firewall allows port 1433, and credentials are correct |
| JWT token validation failed | Ensure `Jwt:Key` matches between API and any frontend/auth services |
| 32-bit process on 64-bit Windows | `win-x86` runs under WOW64; ensure the app pool enables 32-bit applications if using IIS |

## Quick Reference

```powershell
# Publish
dotnet publish SmartEduManager.Api.csproj -c Release -r win-x86 --self-contained true -o ./publish

# Run
cd publish
SmartEduManager.Api.exe

# Set environment variables (optional)
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:ASPNETCORE_URLS = "http://0.0.0.0:5000"
& .\SmartEduManager.Api.exe
```

## File Summary

| File | Purpose |
|------|---------|
| `SmartEduManager.Api.csproj` | Project configuration (set `win-x86`, `SelfContained=true`) |
| `appsettings.json` | Connection strings, JWT settings, allowed hosts |
| `launchSettings.json` | Development profiles (not used in production publish) |
| `PUBLISH_API_WIN32.md` | This documentation |