#!/bin/bash

# BoardGuru MCP Server Installation Script
# Automated deployment for enterprise environments
# 
# Usage: curl -sSL https://install.boardguru.com/mcp | bash
# Or: ./scripts/install.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/boardguru/mcp-server"
INSTALL_DIR="/opt/boardguru-mcp"
SERVICE_USER="boardguru"
SERVICE_NAME="boardguru-mcp"
MIN_NODE_VERSION="18.0.0"
REQUIRED_MEMORY_GB=2

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root. Use 'sudo ./install.sh'"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        error "This installer only supports Linux. For other OS, use Docker: docker run -p 3000:3000 boardguru/governance-mcp"
    fi
    
    # Check architecture
    local arch=$(uname -m)
    if [[ "$arch" != "x86_64" && "$arch" != "aarch64" ]]; then
        error "Unsupported architecture: $arch. Supported: x86_64, aarch64"
    fi
    
    # Check memory
    local memory_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $memory_gb -lt $REQUIRED_MEMORY_GB ]]; then
        warn "System has ${memory_gb}GB memory. Minimum recommended: ${REQUIRED_MEMORY_GB}GB"
    fi
    
    # Check disk space
    local disk_space=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    if [[ $disk_space -lt 5 ]]; then
        error "Insufficient disk space. Need at least 5GB free"
    fi
    
    log "System requirements check passed"
}

# Install Node.js if not present or version too old
install_nodejs() {
    if command -v node &> /dev/null; then
        local current_version=$(node --version | cut -d'v' -f2)
        if version_compare $current_version $MIN_NODE_VERSION; then
            log "Node.js $current_version is already installed"
            return
        else
            warn "Node.js $current_version is too old. Need $MIN_NODE_VERSION or higher"
        fi
    fi
    
    log "Installing Node.js..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    apt-get update
    apt-get install -y nodejs
    
    # Verify installation
    local installed_version=$(node --version | cut -d'v' -f2)
    log "Node.js $installed_version installed successfully"
}

# Version comparison function
version_compare() {
    local version1=$1
    local version2=$2
    if [[ "$(printf '%s\n' "$version2" "$version1" | sort -V | head -n1)" == "$version2" ]]; then
        return 0  # version1 >= version2
    else
        return 1  # version1 < version2
    fi
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    apt-get update
    
    # Install required packages
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        nginx \
        certbot \
        python3-certbot-nginx \
        postgresql-client \
        redis-tools \
        htop \
        jq \
        unzip \
        systemd
    
    log "System dependencies installed"
}

# Create service user
create_service_user() {
    if id "$SERVICE_USER" &>/dev/null; then
        log "Service user '$SERVICE_USER' already exists"
        return
    fi
    
    log "Creating service user '$SERVICE_USER'..."
    useradd --system --create-home --shell /bin/bash "$SERVICE_USER"
    usermod -aG sudo "$SERVICE_USER"
    
    log "Service user created"
}

# Install BoardGuru MCP Server
install_mcp_server() {
    log "Installing BoardGuru MCP Server..."
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    
    # Clone or download the repository
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        log "Updating existing installation..."
        cd "$INSTALL_DIR"
        sudo -u "$SERVICE_USER" git pull origin main
    else
        log "Downloading BoardGuru MCP Server..."
        sudo -u "$SERVICE_USER" git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    # Install npm dependencies
    log "Installing Node.js dependencies..."
    sudo -u "$SERVICE_USER" npm ci --only=production
    
    # Build the application
    log "Building application..."
    sudo -u "$SERVICE_USER" npm run build
    
    # Create necessary directories
    mkdir -p "$INSTALL_DIR/logs" "$INSTALL_DIR/data" "$INSTALL_DIR/config"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod 755 "$INSTALL_DIR"
    
    log "BoardGuru MCP Server installed successfully"
}

# Configure environment
configure_environment() {
    log "Configuring environment..."
    
    local env_file="$INSTALL_DIR/.env"
    
    if [[ ! -f "$env_file" ]]; then
        log "Creating environment configuration..."
        cp "$INSTALL_DIR/.env.example" "$env_file"
        
        # Generate secure JWT secret
        local jwt_secret=$(openssl rand -base64 32)
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" "$env_file"
        
        # Generate encryption key
        local encryption_key=$(openssl rand -base64 32)
        sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$encryption_key|" "$env_file"
        
        # Set production mode
        sed -i "s|NODE_ENV=.*|NODE_ENV=production|" "$env_file"
        sed -i "s|DEMO_MODE=.*|DEMO_MODE=false|" "$env_file"
        
        chown "$SERVICE_USER:$SERVICE_USER" "$env_file"
        chmod 600 "$env_file"
        
        warn "Please edit $env_file to configure your API keys and database settings"
    else
        log "Environment file already exists: $env_file"
    fi
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    local service_file="/etc/systemd/system/$SERVICE_NAME.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=BoardGuru MCP Server - AI-powered board governance intelligence
Documentation=https://docs.boardguru.com/mcp
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/dist/server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR/logs $INSTALL_DIR/data
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictSUIDSGID=true

# Resource limits
LimitNOFILE=65536
TasksMax=4096
MemoryMax=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log "Systemd service created and enabled"
}

# Configure nginx reverse proxy
configure_nginx() {
    log "Configuring Nginx reverse proxy..."
    
    local nginx_config="/etc/nginx/sites-available/$SERVICE_NAME"
    local domain="${1:-localhost}"
    
    cat > "$nginx_config" << EOF
server {
    listen 80;
    server_name $domain;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to BoardGuru MCP Server
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # CORS headers for API access
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3000/health;
    }
    
    # Static files (if any)
    location /static {
        alias $INSTALL_DIR/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable the site
    ln -sf "$nginx_config" "/etc/nginx/sites-enabled/$SERVICE_NAME"
    
    # Remove default nginx site if it exists
    if [[ -f "/etc/nginx/sites-enabled/default" ]]; then
        rm "/etc/nginx/sites-enabled/default"
    fi
    
    # Test nginx configuration
    nginx -t
    
    # Restart nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log "Nginx configured successfully"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    local domain="$1"
    local email="$2"
    
    if [[ "$domain" == "localhost" ]]; then
        warn "Skipping SSL setup for localhost"
        return
    fi
    
    log "Setting up SSL certificate for $domain..."
    
    # Obtain SSL certificate
    certbot --nginx -d "$domain" --email "$email" --agree-tos --non-interactive --redirect
    
    # Setup auto-renewal
    crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -
    
    log "SSL certificate configured successfully"
}

# Create firewall rules
configure_firewall() {
    if ! command -v ufw &> /dev/null; then
        log "UFW not found, skipping firewall configuration"
        return
    fi
    
    log "Configuring firewall..."
    
    # Enable UFW
    ufw --force enable
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80
    ufw allow 443
    
    # Allow MCP server port (if direct access needed)
    # ufw allow 3000
    
    log "Firewall configured"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start BoardGuru MCP Server
    systemctl start "$SERVICE_NAME"
    
    # Check status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "BoardGuru MCP Server started successfully"
    else
        error "Failed to start BoardGuru MCP Server. Check logs: journalctl -u $SERVICE_NAME"
    fi
    
    # Show status
    systemctl status "$SERVICE_NAME" --no-pager
}

# Display installation summary
show_summary() {
    log "Installation completed successfully!"
    echo ""
    info "🚀 BoardGuru MCP Server Installation Summary"
    echo "============================================"
    info "Installation Directory: $INSTALL_DIR"
    info "Service User: $SERVICE_USER"
    info "Service Name: $SERVICE_NAME"
    info "Configuration: $INSTALL_DIR/.env"
    info "Logs: journalctl -u $SERVICE_NAME -f"
    echo ""
    info "📋 Next Steps:"
    echo "1. Edit configuration: nano $INSTALL_DIR/.env"
    echo "2. Add your API keys (OpenAI, Anthropic, etc.)"
    echo "3. Configure database settings"
    echo "4. Restart service: systemctl restart $SERVICE_NAME"
    echo "5. Check status: systemctl status $SERVICE_NAME"
    echo ""
    info "🌐 Access URLs:"
    echo "• API Server: http://localhost:3000"
    echo "• Health Check: http://localhost:3000/health"
    echo "• Demo (if enabled): http://localhost:3001"
    echo ""
    info "📚 Documentation:"
    echo "• Setup Guide: https://docs.boardguru.com/mcp/installation"
    echo "• API Docs: https://docs.boardguru.com/mcp/api"
    echo "• Support: enterprise@boardguru.com"
    echo ""
    warn "⚠️  IMPORTANT: Configure your API keys in $INSTALL_DIR/.env before production use!"
}

# Main installation function
main() {
    local domain="${1:-localhost}"
    local email="${2:-}"
    
    echo ""
    info "🚀 BoardGuru MCP Server Installation"
    info "===================================="
    info "This will install BoardGuru's AI-powered board governance intelligence platform"
    info "Domain: $domain"
    if [[ -n "$email" ]]; then
        info "Email: $email (for SSL certificate)"
    fi
    echo ""
    
    # Confirm installation
    read -p "Continue with installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Installation cancelled"
        exit 0
    fi
    
    # Run installation steps
    check_root
    check_requirements
    install_dependencies
    install_nodejs
    create_service_user
    install_mcp_server
    configure_environment
    create_systemd_service
    configure_nginx "$domain"
    
    # Setup SSL if domain and email provided
    if [[ "$domain" != "localhost" && -n "$email" ]]; then
        setup_ssl "$domain" "$email"
    fi
    
    configure_firewall
    start_services
    show_summary
}

# Handle script arguments
if [[ $# -eq 0 ]]; then
    main
elif [[ $# -eq 1 ]]; then
    main "$1"
elif [[ $# -eq 2 ]]; then
    main "$1" "$2"
else
    echo "Usage: $0 [domain] [email]"
    echo "Example: $0 mcp.example.com admin@example.com"
    exit 1
fi