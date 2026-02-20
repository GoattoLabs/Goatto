# Goatto - Bot de Vanity para Discord

Bot de Discord que otorga roles automáticamente cuando los miembros promocionan tu servidor en su estado personalizado (custom status/vanity).

## 🚀 Características

- ✅ **Sistema de Vanity Automático**: Detecta cuando los miembros tienen tu enlace de invitación en su estado personalizado
- ✅ **Asignación Automática de Roles**: Otorga y quita roles automáticamente según el estado
- ✅ **Sistema de Colores VIP**: Selector de colores exclusivos para miembros VIP
- ✅ **Rate Limiting**: Protección contra abuso de comandos
- ✅ **Sistema de Blacklist/Whitelist**: Control granular de usuarios
- ✅ **Logs de Auditoría**: Registro completo de todas las acciones
- ✅ **Estadísticas**: Comando `/stats` para ver métricas del bot
- ✅ **Health Checks**: Endpoints HTTP para monitoreo
- ✅ **Backup Automático**: Respaldo diario de configuraciones
- ✅ **Sistema de Alertas**: Notificaciones automáticas de errores críticos
- ✅ **Logs Estructurados**: Sistema de logging profesional con Winston
- ✅ **Cache Inteligente**: Optimización de rendimiento con Redis
- ✅ **Batch Processing**: Procesamiento eficiente de escaneos masivos

## 📋 Requisitos Previos

- **Node.js** 16.x o superior
- **PostgreSQL** 12.x o superior
- **Redis** 6.x o superior
- **Token de Bot de Discord** (con los intents necesarios)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Goatto-main
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Token del bot de Discord
BOT_TOKEN=tu_token_aqui

# ID del cliente del bot (opcional)
BOT_CLIENT_ID=tu_client_id

# Estado del bot (opcional)
BOT_STATUS=tu_estado

# ID del servidor donde funciona el sistema de vanity
GUILD_ID=id_del_servidor

# Sistema de Vanity
VANITY_ROLE_ID=id_del_rol_a_otorgar
VANITY_GUILD_ID=id_del_servidor
VANITY_CHANNEL_ID=id_del_canal_notificaciones
VANITY_KEYWORD=.gg/meetspace

# Webhooks
WEBHOOK_URL=url_del_webhook_agradecimiento
ALERT_WEBHOOK_URL=url_del_webhook_alertas

# Base de datos PostgreSQL
PG_DATABASE=vanitybot
PG_USER=tu_usuario
PG_PASSWORD=tu_contraseña
PG_HOST=localhost
PG_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Health Check (opcional)
HEALTH_PORT=3000

# Logging (opcional)
LOG_LEVEL=info
NODE_ENV=production
```

### 4. Configurar PostgreSQL

Crea la base de datos:

```sql
CREATE DATABASE vanitybot;
```

El bot creará automáticamente las tablas necesarias al iniciar.

### 5. Configurar Redis

Asegúrate de que Redis esté corriendo:

```bash
# Linux/Mac
redis-server

# Windows
# Descarga Redis desde https://redis.io/download
```

### 6. Obtener el Token del Bot

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación o selecciona una existente
3. Ve a "Bot" → "Reset Token" o copia el token existente
4. Habilita los siguientes **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent (si usas comandos de mensajes)
5. Pega el token en `BOT_TOKEN` del `.env`

### 7. Registrar Comandos (Opcional)

```bash
node deploy-commands.js
```

### 8. Iniciar el Bot

```bash
npm start
```

O directamente:

```bash
node src/index.js
```

## 📖 Comandos

Todos los comandos requieren permisos de **Administrador**.

### `/setvanity <keyword>`
Configura la palabra clave que el bot buscará en los estados personalizados.

**Ejemplo:**
```
/setvanity .gg/meetspace
```

### `/setchannel <canal>`
Configura el canal donde se enviarán las notificaciones de agradecimiento.

**Ejemplo:**
```
/setchannel #bienvenidas
```

### `/status`
Muestra la configuración actual del sistema de vanity en el servidor.

### `/refresh`
Fuerza un escaneo completo de todos los miembros del servidor para sincronizar roles.

**Nota:** Tiene un cooldown de 5 minutos por servidor.

### `/stats [dias]`
Muestra estadísticas del bot (por defecto últimos 7 días).

**Ejemplo:**
```
/stats dias:30
```

### `/blacklist`
Gestiona la blacklist y whitelist de usuarios.

**Subcomandos:**
- `add <usuario> [razon]` - Añade un usuario a la blacklist
- `remove <usuario>` - Elimina un usuario de blacklist/whitelist
- `list [tipo]` - Lista usuarios en blacklist/whitelist
- `whitelist <usuario> [razon]` - Añade un usuario a la whitelist

**Ejemplo:**
```
/blacklist add usuario:@Usuario razon:Abuso del sistema
```

### `/sendcolorpicker [canal]`
Envía el selector de colores VIP en el canal especificado (o en el canal actual).

### `/say [mensaje] [respuesta]`
Envía un mensaje a través del bot. Si no se especifica mensaje, se abre un modal.

## 🏗️ Arquitectura

```
src/
├── commands/          # Comandos slash
├── events/            # Eventos de Discord
├── models/            # Modelos de base de datos
├── services/          # Servicios (cache, logs, etc.)
├── utils/             # Utilidades
├── workers/           # Workers de BullMQ
└── index.js           # Punto de entrada
```

## 🔍 Health Checks

El bot incluye un servidor HTTP para health checks:

- **GET `/health`** - Estado completo del bot (200 = healthy, 503 = unhealthy)
- **GET `/ready`** - Verifica si el bot está listo (200 = ready, 503 = not ready)
- **GET `/live`** - Verifica si el bot está vivo (siempre 200)

**Ejemplo:**
```bash
curl http://localhost:3000/health
```

## 📊 Logs

Los logs se guardan en el directorio `logs/`:

- `combined.log` - Todos los logs
- `error.log` - Solo errores
- `exceptions.log` - Excepciones no capturadas
- `rejections.log` - Promesas rechazadas

Los logs se rotan automáticamente cada 20MB y se mantienen por 14 días.

## 💾 Backups

Los backups se crean automáticamente cada 24 horas y se guardan en `backups/`.

- Backups individuales: `guild-{guildId}-{timestamp}.json`
- Backups completos: `full-backup-{timestamp}.json`

Los backups antiguos (más de 7 días) se eliminan automáticamente.

## ⚙️ Configuración Avanzada

### Rate Limiting

Los límites están configurados en `src/utils/constants.js`:

- `/refresh`: 1 vez cada 5 minutos por servidor
- `/setvanity`: 3 veces cada 10 minutos por usuario
- Comandos generales: 10 comandos por minuto por usuario

### Cache

El cache tiene los siguientes TTLs:

- Configuraciones de guild: 5 minutos
- Configuraciones de presence: 1 minuto

### Prioridades de Jobs

- **Alta (1)**: Comandos manuales
- **Normal (5)**: Cambios de presencia
- **Baja (10)**: Escaneos automáticos

## 🐛 Troubleshooting

### El bot no otorga roles

1. Verifica que el bot tenga el permiso "Gestionar Roles"
2. Verifica que el rol del bot esté por encima del rol a otorgar
3. Verifica que el Presence Intent esté habilitado
4. Revisa los logs en `logs/error.log`

### Error de conexión a PostgreSQL

1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en `.env`
3. Verifica que la base de datos exista

### Error de conexión a Redis

1. Verifica que Redis esté corriendo
2. Verifica la configuración en `.env`
3. El bot puede funcionar sin Redis pero con limitaciones

### Rate limit de Discord

Si ves errores de rate limit, el bot los maneja automáticamente y enviará una alerta si está configurado `ALERT_WEBHOOK_URL`.

## 📝 Notas Importantes

- El bot necesita el **Presence Intent** habilitado en el Developer Portal
- El bot necesita el **Server Members Intent** habilitado
- El rol del bot debe estar **por encima** del rol que va a otorgar
- Los escaneos completos pueden tardar varios minutos en servidores grandes
- El sistema de cache se invalida automáticamente cuando cambias configuraciones

## 🔒 Seguridad

- Todos los comandos requieren permisos de Administrador
- Rate limiting protege contra abuso
- Validación de inputs en todos los comandos
- Logs de auditoría para todas las acciones
- Manejo seguro de errores

## 📄 Licencia

MIT

## 👥 Créditos

- Autor original: joshiny
- Mejoras y mantenimiento: [Tu nombre]

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa los logs en `logs/error.log`
2. Verifica la configuración en `.env`
3. Revisa los health checks en `http://localhost:3000/health`
4. Abre un issue en el repositorio

---

**¡Disfruta usando Goatto!** 🎉
