# ============================================================
# Stage 1 — Build: compile assets and install PHP dependencies
# ============================================================
FROM php:8.3-fpm-alpine AS builder

# Install build-time OS dependencies
RUN apk add --no-cache \
    bash \
    git \
    unzip \
    curl \
    zip \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    nodejs \
    npm \
    chromium \
    chromium-chromedriver

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" \
    pdo \
    pdo_mysql \
    mbstring \
    bcmath \
    gd \
    zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

ENV COMPOSER_ALLOW_SUPERUSER=1

# Install PHP dependencies (cached layer)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Install Node dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application source
COPY . .

# Ensure all required Laravel directories exist
RUN mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/testing \
    storage/logs \
    bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

# Re-run autoload discovery now that artisan is present
RUN composer dump-autoload --no-dev --optimize

# Use an in-memory SQLite DB so artisan commands don't need a real DB at build time
ENV DB_CONNECTION=sqlite
ENV DB_DATABASE=:memory:
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Generate Wayfinder routes
RUN php artisan wayfinder:generate --with-form

# Compile frontend assets
RUN npm run build

# Create the public storage symlink
RUN php artisan storage:link || true

# ============================================================
# Stage 2 — Runtime: Nginx + PHP-FPM + supervisord
# ============================================================
FROM php:8.3-fpm-alpine AS runtime

# Install runtime OS dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    libzip \
    libpng \
    libjpeg-turbo \
    freetype \
    oniguruma \
    chromium \
    chromium-chromedriver \
 && mkdir -p /run/nginx

# Install the same PHP extensions in the runtime image
RUN apk add --no-cache \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" \
    pdo \
    pdo_mysql \
    mbstring \
    bcmath \
    gd \
    zip \
 && apk del libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev oniguruma-dev

WORKDIR /app

# Copy the fully-built application from the builder stage
COPY --from=builder /app /app

# ── Nginx configuration ──────────────────────────────────────
RUN mkdir -p /etc/nginx/conf.d
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# ── supervisord configuration ────────────────────────────────
COPY docker/supervisord.conf /etc/supervisord.conf

# ── PHP-FPM: run as www-data, listen on 127.0.0.1:9000 ──────
RUN sed -i \
    -e 's|listen = 9000|listen = 127.0.0.1:9000|g' \
    /usr/local/etc/php-fpm.d/www.conf

# Fix ownership so PHP-FPM (www-data) can write to storage
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache \
 && chmod -R 775 /app/storage /app/bootstrap/cache

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]