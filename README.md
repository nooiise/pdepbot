# PdePBot - Gestor de Grupos para Discord

## Características

- **Soporte Multi-servidor**: Cada servidor (por ejemplo, uno por cada comisión o turno) tiene su propia configuración independiente.
- **Configuración Dinámica**: Mediante el comando `/setup`, los administradores pueden definir el canal de control, el rol de administrador y si se deben crear canales de voz automáticamente.
- **Creación de Grupos**: El comando `/create-group` verifica si los roles o canales ya existen antes de crearlos, evitando duplicados y respetando canales creados manualmente.
- **Permisos Automáticos**: Configura los canales para que solo los miembros del grupo y los administradores puedan verlos.

## Requisitos Previos

1. Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).
2. Crear una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications).
3. En la sección **Bot** del portal, activar el **Server Members Intent**.

## Instalación y Despliegue

1. **Clonar o descargar** este repositorio en el servidor o computadora de destino.
2. **Instalar las dependencias**:
   ```bash
   npm install
   ```
3. **Configurar el entorno**:
   Crea un archivo llamado `.env` en la raíz del proyecto basándote en el archivo `.env.example`:
   ```env
   DISCORD_TOKEN=tu_token_aqui
   CLIENT_ID=id_de_tu_aplicacion_aqui
   ```
4. **Compilar el proyecto**:
   ```bash
   npm run build
   ```
5. **Iniciar el bot**:
   ```bash
   npm start
   ```

## Configuración en Discord

1. **Invitar al bot**: Genera una URL de invitación en el portal de desarrolladores con los scopes `applications.commands` y `bot`, y otórgale permisos de "Gestionar Canales" y "Gestionar Roles".
2. **Comando de Configuración**: En cada servidor donde uses el bot, un administrador (con permiso de Administrador) debe ejecutar:
   - `/setup <canal> <rol> <crear_voz>`
   - `canal`: El canal de texto donde se enviarán los comandos de administración.
   - `rol`: El rol que tendrá permiso para crear grupos.
   - `crear_voz`: `True` si quieres que el bot cree canales de voz para cada grupo, `False` si solo quieres canales de texto.

## Uso

Para crear un grupo, utiliza el siguiente comando en el canal configurado anteriormente:

```
/create-group <nombre> <miembros>
```

- **nombre**: Ejemplo: `Los-Magios`. El bot creará el rol `Grupo Los-Magios` y el canal `#grupo-los-magios`.
- **miembros**: Una lista de menciones (ej: `@Alumno1 @Alumno2`) o IDs de Discord. El bot les asignará automáticamente el rol del grupo.

## Desarrollo

Si deseas realizar cambios en el código:
- Usa `npm run dev` para ejecutar el bot directamente con `ts-node`.
- El bot utiliza TypeScript en modo estricto para garantizar la calidad del código.
