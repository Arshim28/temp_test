FROM openresty/openresty:latest

# 1. Install build prerequisites for compiling LuaRocks and building lua-resty-jwt
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libssl-dev \
    libreadline-dev \
    unzip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local
RUN curl -L -O https://luarocks.org/releases/luarocks-3.11.1.tar.gz && \
    tar zxpf luarocks-3.11.1.tar.gz && \
    cd luarocks-3.11.1 && \
    ./configure && \
    make && \
    make install

RUN luarocks install lua-resty-jwt

# 4. Copy your custom nginx configuration file into the container.
#    Ensure that the file "nginx_tiles.conf" is in the same directory as this Dockerfile.
COPY nginx_tiles.conf /etc/nginx/conf.d/default.conf

# 5. Expose port 80 and run OpenResty in the foreground.
EXPOSE 80
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
