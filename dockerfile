FROM php:8.3-cli

# Install Linux dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    zip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    nodejs \
    npm \
    chromium \
    chromium-driver

# Configure GD
RUN docker-php-ext-configure gd --with-freetype --with-jpeg

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy application
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Install frontend dependencies
RUN npm install

# Build Vite assets
RUN npm run build

# Storage link
RUN php artisan storage:link || true

# Chromium path for Puppeteer/Browsershot
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Railway port
EXPOSE 8080

# Startup command
CMD php artisan serve --host=0.0.0.0 --port=${PORT:-8080}