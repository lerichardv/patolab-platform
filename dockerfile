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

# Copy composer files first for caching
COPY composer.json composer.lock ./

RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy package files
COPY package.json package-lock.json ./

RUN npm ci

# Copy app
COPY . .

# Build frontend
RUN npm run build

# Laravel optimization
RUN php artisan storage:link || true

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 8080

CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]