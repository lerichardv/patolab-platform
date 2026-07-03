# PatoLab Platform

PatoLab is a web application designed for laboratory management, tracking specimen diagnostics, billing, and pathologists' tasks.

---

## Technical Stack
- **Backend**: Laravel 11 (PHP 8.2+)
- **Frontend**: React (Inertia.js) + TypeScript + Tailwind CSS (Vite / Rolldown)
- **Database**: MySQL / PostgreSQL
- **PDF Generation**: Spatie Browsershot / Chromium

---

## Local Setup & Installation

### 1. Requirements
Ensure you have the following installed on your system:
- **PHP 8.2 or higher** (with `gd`, `pdo_mysql`, `mbstring`, `bcmath`, `zip`, `opcache` extensions)
- **Composer**
- **Node.js & NPM**
- **Database Server** (MySQL / PostgreSQL)
- **Chromium / Chrome** (Required for PDF generation via Browsershot)

### 2. Installation Steps
1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd patolab
   ```

2. **Install Composer dependencies**:
   ```bash
   composer install
   ```

3. **Install NPM packages**:
   ```bash
   npm install
   ```

4. **Environment Configuration**:
   Copy the example environment file and configure your database settings, application URL, etc.:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and configure `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, etc.*

5. **Generate Application Key**:
   ```bash
   php artisan key:generate
   ```

6. **Link Storage**:
   ```bash
   php artisan storage:link
   ```

7. **Generate JS Forms/Routes (Wayfinder)**:
   ```bash
   php artisan wayfinder:generate --with-form
   ```

8. **Compile Frontend Assets**:
   For development (auto-reload):
   ```bash
   npm run dev
   ```
   For production:
   ```bash
   npm run build
   ```

9. **Run the Development Server**:
   ```bash
   php artisan serve
   ```

---

## Database Migrations & Seeders

To set up the database schema and populate it with initial or seeded data:

### Run Migrations
Run the database migrations to create all database tables:
```bash
php artisan migrate
```

### Run Seeders
To seed initial values (such as roles, priorities, specimen types, Referrers, and test users):
```bash
php artisan db:seed
```

### Reset & Seed (Fresh Start)
To wipe the database, run all migrations, and seed all data from scratch:
```bash
php artisan migrate:fresh --seed
```

---

## Test User Credentials

After running the seeders, you can log in to the application using the following admin account:

- **Email**: `ricardo.valladares.triminio@gmail.com`
- **Password**: `12345678`

*Other seeded administrators include:*
- Ana Urbina: `ana.urbina@patolab.org` (Password: `12345678`)
- Pedro Castro: `pedro.castro@patolab.org` (Password: `12345678`)
- Rolando Urbina: `davidursal23@gmail.com` (Password: `12345678`)

---

## Deployment Guide

When deploying the project to a production server or container environment:

1. **Production Configuration (.env)**:
   Ensure the following production settings are configured:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://your-domain.com
   ```

2. **Composer Optimization**:
   Install dependencies optimizing the autoloader and excluding development packages:
   ```bash
   composer install --no-dev --optimize-autoloader
   ```

3. **Asset Compilation**:
   Install frontend dependencies and build the production bundle:
   ```bash
   npm ci
   npm run build
   ```

4. **Laravel Caching**:
   Run these commands to cache routing and config for production performance:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

5. **Directory Permissions**:
   Always ensure the storage and cache directories have the correct permissions and ownership (e.g. for `www-data` web server user):
   ```bash
   chmod -R 775 storage
   chmod -R 775 bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   # 1. Set correct ownership (usually www-data, or the user running PHP-FPM)
   sudo chown -R www-data:www-data storage bootstrap/cache
   # 2. Make all directories under storage readable and traversable (775)
   sudo find storage -type d -exec chmod 775 {} \;
   # 3. Make all files under storage readable (664)
   sudo find storage -type f -exec chmod 664 {} \;
   ```

6. **Run Production Migrations**:
   Run database updates safely:
   ```bash
   php artisan migrate --force
   ```

7. **Queue Worker & Scheduler**:
   Ensure a worker daemon is running if queue jobs are used, and schedule Laravel's cron task:
   ```bash
   php artisan queue:work --daemon
   ```

8. **Chromium Path (for PDF Invoices)**:
   Make sure Chromium is installed on the server. Configure the executable path in `.env` if necessary:
   ```env
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
   ```

9. **Supervisor Configuration (for Collaboration Server)**:
   Any time the `editor-collaboration-server` (or queue workers) is updated, you must reload/restart Supervisor to apply the changes. Open your terminal and run these commands:
   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl restart [process_name]
   ```

---

## ⚠️ Database Restoration Rules (Crucial)

When restoring a database backup or dumping data into a new database, the `priorities_specimens_order` table might contain stale or duplicate records. This can cause cards to appear duplicated on the Kanban board.

To prevent this issue, **you must clean up the `priorities_specimens_order` table** after restoring the database. 

Run the following SQL script to clean up obsolete or mismatched records:

```sql
DELETE FROM priorities_specimens_order 
WHERE NOT EXISTS (
    SELECT 1 FROM specimen 
    WHERE specimen.id = priorities_specimens_order.specimen_id 
      AND specimen.priority_id = priorities_specimens_order.priority_id
);
```

Or run the Laravel Tinker command:

```bash
php artisan tinker --execute="DB::table('priorities_specimens_order')->whereNotExists(function(\$q) { \$q->select(DB::raw(1))->from('specimen')->whereColumn('specimen.id', '=', 'priorities_specimens_order.specimen_id')->whereColumn('specimen.priority_id', '=', 'priorities_specimens_order.priority_id'); })->delete();"
```
