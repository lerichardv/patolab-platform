FROM php:8.3-fpm

# Install Nginx, Supervisor, and minimal required packages
RUN apt-get update && apt-get install -y \
	nginx \
	supervisor \
	git \
	unzip \
	curl \
	zip \
	libzip-dev \
	libpng-dev \
	libjpeg62-turbo-dev \
	libfreetype6-dev \
	libonig-dev \
	nodejs \
	npm \
	chromium \
	&& rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
	&& docker-php-ext-install pdo pdo_mysql mbstring bcmath gd zip opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Allow plugins to run cleanly as root inside Docker
ENV COMPOSER_ALLOW_SUPERUSER=1

# Copy composer files first for caching
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application code
COPY . .

# Re-create missing Laravel storage directories and set permissions
RUN mkdir -p \
	storage/framework/cache/data \
	storage/framework/sessions \
	storage/framework/views \
	storage/logs \
	bootstrap/cache && \
	chmod -R 775 storage bootstrap/cache && \
	chown -R www-data:www-data storage bootstrap/cache 

# Run the autoload discovery now that artisan exists
RUN composer dump-autoload --no-dev --optimize

# Prevent Laravel from crashing during build if it looks for a DB
ENV DB_CONNECTION=sqlite
ENV DB_DATABASE=:memory:

# Run Wayfinder translation mapping and compile React assets
RUN php artisan storage:link --force || true
RUN php artisan wayfinder:generate --with-form
RUN php artisan migrate --force
RUN npm run build

# Set up Puppeteer environment variable
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_PATH=/usr/lib/node_modules
ENV PATH=$PATH:/usr/bin:/usr/local/bin
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

# --- Configure Nginx and Supervisor Inline ---
RUN echo 'server {\n\
	listen 8080;\n\
	listen [::]:8080;\n\
	server_name _;\n\
	root /app/public;\n\
	index index.php;\n\
	charset utf-8;\n\
	client_max_body_size 100M;\n\
	\n\
	location / {\n\
	try_files $uri $uri/ /index.php?$query_string;\n\
	}\n\
	\n\
	location = /favicon.ico { access_log off; log_not_found off; }\n\
	location = /robots.txt  { access_log off; log_not_found off; }\n\
	\n\
	error_page 404 /index.php;\n\
	\n\
	location ~ \\.php$ {\n\
	fastcgi_pass 127.0.0.1:9000;\n\
	fastcgi_index index.php;\n\
	fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n\
	include fastcgi_params;\n\
	fastcgi_buffering on;\n\
	fastcgi_buffer_size 16k;\n\
	fastcgi_buffers 16 16k;\n\
	fastcgi_connect_timeout 60s;\n\
	fastcgi_send_timeout 60s;\n\
	fastcgi_read_timeout 60s;\n\
	}\n\
	\n\
	location ~ /\\.(?!well-known).* {\n\
	deny all;\n\
	}\n\
	}' > /etc/nginx/sites-available/default

RUN echo '[supervisord]\n\
	nodaemon=true\n\
	user=root\n\
	logfile=/var/log/supervisor/supervisord.log\n\
	pidfile=/var/run/supervisord.pid\n\
	\n\
	[program:php-fpm]\n\
	command=php-fpm\n\
	stdout_logfile=/dev/stdout\n\
	stdout_logfile_maxbytes=0\n\
	stderr_logfile=/dev/stderr\n\
	stderr_logfile_maxbytes=0\n\
	autorestart=true\n\
	\n\
	[program:nginx]\n\
	command=nginx -g "daemon off;"\n\
	stdout_logfile=/dev/stdout\n\
	stdout_logfile_maxbytes=0\n\
	stderr_logfile=/dev/stderr\n\
	stderr_logfile_maxbytes=0\n\
	autorestart=true\n' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

# Supervisor manages both Nginx and PHP-FPM processes simultaneously
CMD ["sh", "-c", "\
	chmod -R 755 /app/storage /app/public && \
	chown -R www-data:www-data /app/storage /app/public && \
	/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf"]