# Plataforma PatoLab

PatoLab es una aplicación web diseñada para la gestión de laboratorios, seguimiento de diagnósticos de muestras, facturación y tareas de patólogos.

---

## Stack Tecnológico
- **Backend**: Laravel 13 (PHP 8.3+) + Fortify
- **Frontend**: React 19 (Inertia.js v3) + TypeScript + Tailwind CSS 4 (Vite)
- **Base de datos**: SQLite (desarrollo/pruebas) / MySQL / PostgreSQL (producción)
- **WebSockets en Tiempo Real**:
  - **Laravel Reverb**: Eventos y notificaciones en vivo (ej. Control de Órdenes de Trabajo).
  - **Hocuspocus v4**: Servidor de edición colaborativa en tiempo real (TipTap + Yjs) en `editor-collaboration-server/` (puerto `1234`).
- **Generación de PDF**: Spatie Browsershot / Chromium

---

## Configuración Local e Instalación

### 1. Requisitos Previos
Asegúrate de tener instalado lo siguiente en tu sistema:
- **PHP 8.2 o superior** (con extensiones `gd`, `pdo_mysql`, `mbstring`, `bcmath`, `zip`, `opcache`)
  - **Configuración requerida**: Establecer `max_input_vars = 10000` en `php.ini` (CLI y PHP-FPM) para admitir solicitudes `multipart/form-data` con grupos grandes de muestras y archivos adjuntos.
- **Composer**
- **Node.js & NPM**
- **Servidor de Base de Datos** (MySQL / PostgreSQL)
- **Chromium / Chrome** (Requerido para la generación de PDF mediante Browsershot)

### 2. Pasos de Instalación
1. **Clonar el repositorio**:
   ```bash
   git clone <repository_url>
   cd patolab
   ```

2. **Instalar dependencias de Composer**:
   ```bash
   composer install
   ```

3. **Instalar paquetes de NPM**:
   ```bash
   npm install
   ```

4. **Configuración de Variables de Entorno**:
   Copia el archivo de entorno de ejemplo y configura los datos de tu base de datos, URL de la aplicación, etc.:
   ```bash
   cp .env.example .env
   ```
   *Edita `.env` y configura `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, etc.*

5. **Generar Clave de la Aplicación**:
   ```bash
   php artisan key:generate
   ```

6. **Crear Enlace Simbólico de Almacenamiento**:
   ```bash
   php artisan storage:link
   ```

7. **Generar Formularios y Rutas JS (Wayfinder)**:
   ```bash
   php artisan wayfinder:generate --with-form
   ```

8. **Compilar Recursos Frontend**:
   Para desarrollo (con recarga automática):
   ```bash
   npm run dev
   ```
   Para producción:
   ```bash
   npm run build
   ```

9. **Ejecutar el Servidor de Desarrollo**:

   **Opción A (Recomendada — Todo en uno con `composer dev`)**:
   Inicia concurrentemente el servidor web (`artisan serve`), el procesador de colas (`queue:listen`), el visualizador de logs (`pail`), Vite (`npm run dev`) y el servidor WebSocket de Laravel Reverb (`reverb:start --debug`):
   ```bash
   composer dev
   ```

   **Opción B (Servidores individuales en terminales separadas)**:
   - **Servidor web de Laravel**:
     ```bash
     php artisan serve
     ```
   - **Compilador Vite**:
     ```bash
     npm run dev
     ```
   - **Procesador de colas**:
     ```bash
     php artisan queue:listen
     ```
   - **Servidor WebSocket de Laravel Reverb** (puerto `8080`, para eventos y notificaciones en tiempo real):
     ```bash
     php artisan reverb:start --debug
     ```

10. **Servidor WebSocket de Colaboración (Hocuspocus / Editor de Informes)**:
    El editor de informes diagnósticos colaborativo (TipTap + Yjs) requiere su propio servidor WebSocket en Node.js ubicado en `editor-collaboration-server/` (puerto `1234`):
    ```bash
    cd editor-collaboration-server
    cp .env.example .env
    npm install
    npm run dev
    ```
    *Para volver a la raíz del proyecto: `cd ..`*

---

## Migraciones y Seeders de la Base de Datos

Para configurar el esquema de la base de datos y poblarla con datos iniciales o de prueba:

### Ejecutar Migraciones
Ejecuta las migraciones de la base de datos para crear todas las tablas:
```bash
php artisan migrate
```

### Ejecutar Seeders
Para poblar los valores iniciales (como roles, prioridades, tipos de muestras, médicos remitentes y usuarios de prueba):
```bash
php artisan db:seed
```

### Reiniciar y Poblar (Inicio Desde Cero)
Para limpiar la base de datos, ejecutar todas las migraciones y poblar todos los datos desde cero:
```bash
php artisan migrate:fresh --seed
```

### Rellenar Fechas de Cambio de Estado de Muestras
Para poblar las marcas de tiempo faltantes en cambios de estado (`received_at`, `macroscopic_review_at`, `processing_at`, `microscopic_review_at`, `finalized_at`, `delivered_at`, `cancelled_at`) en registros existentes de `specimen` utilizando el historial de la tabla `audit_log`:

```bash
php artisan specimens:backfill-status-dates
```

Opciones:
- `--dry-run`: Previsualiza los cambios sin actualizar la base de datos.
- `--force`: Sobrescribe las fechas de estado existentes incluso si ya están pobladas.


---

## Credenciales de Usuarios de Prueba

Después de ejecutar los seeders, puedes iniciar sesión en la aplicación utilizando la siguiente cuenta de administrador:

- **Correo electrónico**: `ricardo.valladares.triminio@gmail.com`
- **Contraseña**: `12345678`

*Otros administradores creados por el seeder:*
- Ana Urbina: `ana.urbina@patolab.org` (Contraseña: `12345678`)
- Pedro Castro: `pedro.castro@patolab.org` (Contraseña: `12345678`)
- Rolando Urbina: `davidursal23@gmail.com` (Contraseña: `12345678`)

---

## Guía de Despliegue

Al desplegar el proyecto en un servidor de producción o entorno de contenedores:

1. **Configuración de Producción (.env)**:
   Asegúrate de que las siguientes opciones de producción estén configuradas:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://tu-dominio.com
   ```

2. **Optimización de Composer**:
   Instala las dependencias optimizando el cargador automático y excluyendo los paquetes de desarrollo:
   ```bash
   composer install --no-dev --optimize-autoloader
   ```

3. **Compilación de Recursos**:
   Instala las dependencias frontend y construye el paquete de producción:
   ```bash
   npm ci
   npm run build
   ```

4. **Caché de Laravel**:
   Ejecuta estos comandos para almacenar en caché las rutas y la configuración para obtener el máximo rendimiento en producción:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

5. **Permisos de Directorios**:
   Asegúrate siempre de que los directorios de almacenamiento (`storage`) y caché tengan los permisos y propiedad correctos (por ejemplo, para el usuario del servidor web `www-data`):
   ```bash
   chmod -R 775 storage
   chmod -R 775 bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   # 1. Asignar propiedad correcta (usualmente www-data, o el usuario que ejecuta PHP-FPM)
   sudo chown -R www-data:www-data storage bootstrap/cache
   # 2. Hacer que todos los directorios bajo storage sean legibles y accesibles (775)
   sudo find storage -type d -exec chmod 775 {} \;
   # 3. Hacer que todos los archivos bajo storage sean legibles (664)
   sudo find storage -type f -exec chmod 664 {} \;
   ```

6. **Ejecutar Migraciones de Producción**:
   Ejecuta las actualizaciones de la base de datos de forma segura:
   ```bash
   php artisan migrate --force
   ```

7. **Procesador de Colas y Programador**:
   Ejecutar el procesador de colas es necesario para permitir que la plataforma procese trabajos y envíe correos electrónicos. Asegúrate de que haya un demonio worker ejecutándose en producción:
   ```bash
   php artisan queue:work --queue=default --tries=3 --timeout=60
   ```

8. **Ruta de Chromium (para Facturas en PDF)**:
   Asegúrate de que Chromium esté instalado en el servidor. Configura la ruta del ejecutable en el `.env` si es necesario:
   ```env
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
   ```

9. **Configuración de PHP (`max_input_vars`)**:
   Es indispensable configurar `max_input_vars = 10000` en tu configuración de PHP (`php.ini` o en el pool de PHP-FPM y CLI). Esto previene que PHP descarte silenciosamente campos al procesar formularios grandes con múltiples muestras agrupadas (30+ muestras) y archivos adjuntos vía `multipart/form-data`:
   ```ini
   max_input_vars = 10000
   ```

10. **Configuración de Supervisor (Servidores WebSocket y Procesadores en Segundo Plano)**:
    En un entorno de producción, los servicios persistentes deben ejecutarse en segundo plano gestionados por Supervisor:

    #### A. Laravel Reverb (Servidor WebSocket de Eventos y Notificaciones en Vivo)
    Crea el archivo `/etc/supervisor/conf.d/patolab-reverb.conf`:
    ```ini
    [program:patolab-reverb]
    process_name=%(program_name)s
    command=php /var/www/patolab/artisan reverb:start
    autostart=true
    autorestart=true
    user=www-data
    redirect_stderr=true
    stdout_logfile=/var/www/patolab/storage/logs/reverb.log
    stopwaitsecs=3600
    ```

    #### B. Servidor de Colaboración Hocuspocus (WebSockets del Editor de Informes Diagnósticos)
    Instala las dependencias en la carpeta del servidor de colaboración:
    ```bash
    cd /var/www/patolab/editor-collaboration-server
    npm ci --omit=dev
    ```
    Crea el archivo `/etc/supervisor/conf.d/patolab-collaboration.conf`:
    ```ini
    [program:patolab-collaboration]
    process_name=%(program_name)s
    directory=/var/www/patolab/editor-collaboration-server
    command=node index.js
    autostart=true
    autorestart=true
    user=www-data
    environment=NODE_ENV="production"
    redirect_stderr=true
    stdout_logfile=/var/www/patolab/storage/logs/collaboration.log
    ```

    #### C. Procesador de Colas de Laravel (Queue Worker)
    Crea el archivo `/etc/supervisor/conf.d/patolab-worker.conf`:
    ```ini
    [program:patolab-worker]
    process_name=%(program_name)s_%(process_num)02d
    command=php /var/www/patolab/artisan queue:work --queue=default --sleep=3 --tries=3 --max-time=3600
    autostart=true
    autorestart=true
    user=www-data
    numprocs=2
    redirect_stderr=true
    stdout_logfile=/var/www/patolab/storage/logs/worker.log
    stopwaitsecs=3600
    ```

    #### D. Aplicar cambios y reiniciar servicios en Supervisor
    Cada vez que se actualice el código o la configuración, recarga y reinicia los procesos:
    ```bash
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl restart all
    ```

11. **Configuración de Firma Digital de Documentos**:
    Sigue estos pasos para configurar certificados SSL y rutas de claves para la firma digital de documentos PDF:

    #### 1. Crear el Directorio Seguro en el Sistema Operativo
    Crea una ruta en el sistema dedicada a las credenciales del LIS (por ejemplo, en `/etc/ssl/patolab/` o `/opt/patolab/certs/`) y asigna la propiedad al usuario del servidor web (`www-data`):

    ```bash
    # Crear directorio protegido en el servidor
    sudo mkdir -p /etc/ssl/patolab/certs

    # Generar los certificados dentro del directorio protegido
    cd /etc/ssl/patolab/certs

    # 1. CA Raíz
    sudo openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
      -keyout lab_ca.key \
      -out lab_ca.crt \
      -subj "/C=HN/ST=FM/L=Tegucigalpa/O=Laboratorio Patolab/CN=Patolab Root CA"

    # 2. Clave del Firmador y CSR
    sudo openssl req -newkey rsa:2048 -nodes \
      -keyout report_signer.key \
      -out report_signer.csr \
      -subj "/C=HN/ST=FM/L=Tegucigalpa/O=Laboratorio Patolab/OU=Emision/CN=Patolab LIS Signer"

    # 3. Firmar el certificado
    sudo openssl x509 -req -in report_signer.csr \
      -CA lab_ca.crt \
      -CAkey lab_ca.key \
      -CAcreateserial \
      -out report_signer.crt \
      -days 1825 \
      -sha256
    ```

    #### 2. Configurar Permisos Estrictos
    Asegura que únicamente el usuario que ejecuta PHP-FPM / Nginx (`www-data`) tenga acceso de lectura a la clave privada:

    ```bash
    # Asignar usuario www-data como dueño
    sudo chown -R www-data:www-data /etc/ssl/patolab/certs

    # Permiso 700 al directorio (solo el dueño puede entrar)
    sudo chmod 700 /etc/ssl/patolab/certs

    # Permiso 600 a las claves privadas (solo lectura para www-data)
    sudo chmod 600 /etc/ssl/patolab/certs/*.key

    # Permiso 644 a los certificados públicos
    sudo chmod 644 /etc/ssl/patolab/certs/*.crt
    ```

    #### 3. Configurar las Rutas en las Variables de Entorno (.env)
    En lugar de rutas relativas quemadas en el código (hardcoded), inyecta las rutas absolutas a través del archivo `.env` de Laravel:

    En tu archivo `.env`:

    ```env
    PDF_SIGNER_CERT_PATH=/etc/ssl/patolab/certs/report_signer.crt
    PDF_SIGNER_KEY_PATH=/etc/ssl/patolab/certs/report_signer.key
    PDF_SIGNER_CA_PATH=/etc/ssl/patolab/certs/lab_ca.crt
    ```

---

## ⚠️ Reglas para la Restauración de la Base de Datos (Crucial)

Al restaurar una copia de seguridad de la base de datos o volcar datos en una nueva base de datos, la tabla `priorities_specimens_order` puede contener registros desactualizados o duplicados. Esto puede hacer que las tarjetas aparezcan duplicadas en el tablero Kanban.

Para prevenir este problema, **debes limpiar la tabla `priorities_specimens_order`** después de restaurar la base de datos.

Ejecuta el siguiente script SQL para limpiar los registros obsoletos o no coincidentes:

```sql
DELETE FROM priorities_specimens_order 
WHERE NOT EXISTS (
    SELECT 1 FROM specimen 
    WHERE specimen.id = priorities_specimens_order.specimen_id 
      AND specimen.priority_id = priorities_specimens_order.priority_id
);
```

O ejecuta el comando Tinker de Laravel:

```bash
php artisan tinker --execute="DB::table('priorities_specimens_order')->whereNotExists(function(\$q) { \$q->select(DB::raw(1))->from('specimen')->whereColumn('specimen.id', '=', 'priorities_specimens_order.specimen_id')->whereColumn('specimen.priority_id', '=', 'priorities_specimens_order.priority_id'); })->delete();"
```
