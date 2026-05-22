FROM php:8.3-cli

# Install minimal required packages
RUN apt-get update && apt-get install -y \
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

# Configure GD
RUN docker-php-ext-configure gd --with-freetype --with-jpeg

# Install PHP extensions
RUN docker-php-ext-install \
	pdo \
	pdo_mysql \
	mbstring \
	bcmath \
	gd \
	zip

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

# Copy app
COPY . .

# --- NEW FIX: Re-create missing Laravel storage directories ---
RUN mkdir -p \
	storage/framework/cache/data \
	storage/framework/sessions \
	storage/framework/views \
	storage/framework/testing \
	storage/logs \
	bootstrap/cache && \
	chmod -R 775 storage bootstrap/cache

# --- Run the autoload discovery now that artisan exists ---
RUN composer dump-autoload --no-dev --optimize

# Prevent Laravel from crashing during build if it looks for a DB
ENV DB_CONNECTION=sqlite
ENV DB_DATABASE=:memory:

# This should now execute perfectly!
RUN php artisan wayfinder:generate --with-form

# Build frontend
RUN npm run build

# Laravel optimization
RUN php artisan storage:link || true

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 8080

# Force the port to be evaluated cleanly by the shell before passing it to artisan
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t public/"]