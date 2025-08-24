#!/bin/bash
set -e

# BoardGuru SSL Certificate Setup
# Handles SSL certificate configuration for demo.boardguru.ai

DOMAIN="demo.boardguru.ai"
EMAIL="admin@boardguru.ai"

echo "🔒 Setting up SSL certificates for $DOMAIN"
echo "=========================================="

# Function to check if SSL certificate exists and is valid
check_ssl() {
    echo "Checking SSL certificate for $DOMAIN..."
    
    # Check if certificate exists and get expiry date
    if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        local expiry=$(openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
        echo "✅ SSL certificate is active"
        echo "   Expires: $expiry"
        
        # Check if certificate expires in next 30 days
        local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null || echo "0")
        local now_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - now_epoch) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            echo "⚠️  Certificate expires in $days_until_expiry days - renewal recommended"
            return 1
        else
            echo "✅ Certificate is valid for $days_until_expiry days"
            return 0
        fi
    else
        echo "❌ No valid SSL certificate found"
        return 1
    fi
}

# Let's Encrypt setup for Docker deployment
setup_letsencrypt() {
    echo "🔸 Setting up Let's Encrypt SSL certificate..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        echo "Installing Certbot..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install certbot
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
    fi
    
    # Create certificate directory
    mkdir -p ./ssl
    
    # Generate certificate using webroot method
    echo "Generating SSL certificate for $DOMAIN..."
    sudo certbot certonly \
        --webroot \
        --webroot-path=./ssl-challenges \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN \
        --cert-path ./ssl/live/$DOMAIN/cert.pem \
        --key-path ./ssl/live/$DOMAIN/privkey.pem \
        --fullchain-path ./ssl/live/$DOMAIN/fullchain.pem
    
    # Set up auto-renewal
    echo "Setting up auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    echo "✅ Let's Encrypt certificate installed"
}

# CloudFlare SSL setup
setup_cloudflare_ssl() {
    echo "🔸 CloudFlare SSL configuration..."
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo "❌ CLOUDFLARE_API_TOKEN environment variable not set"
        echo "Please set your CloudFlare API token and try again"
        exit 1
    fi
    
    # Check CloudFlare SSL status via API
    local zone_id=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=boardguru.ai" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | \
        jq -r '.result[0].id')
    
    if [ "$zone_id" != "null" ]; then
        # Set SSL mode to Full (strict)
        curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$zone_id/settings/ssl" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{"value":"full"}' > /dev/null
        
        # Enable Always Use HTTPS
        curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$zone_id/settings/always_use_https" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{"value":"on"}' > /dev/null
        
        echo "✅ CloudFlare SSL configured"
    else
        echo "❌ Could not find CloudFlare zone for boardguru.ai"
    fi
}

# AWS Certificate Manager setup
setup_aws_ssl() {
    echo "🔸 Setting up AWS Certificate Manager SSL..."
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not found"
        exit 1
    fi
    
    # Request certificate
    echo "Requesting SSL certificate from AWS Certificate Manager..."
    local cert_arn=$(aws acm request-certificate \
        --domain-name $DOMAIN \
        --validation-method DNS \
        --subject-alternative-names "*.boardguru.ai" \
        --region us-east-1 \
        --output text \
        --query 'CertificateArn')
    
    if [ -n "$cert_arn" ]; then
        echo "✅ Certificate requested: $cert_arn"
        echo ""
        echo "Please add the DNS validation records shown in AWS Console:"
        aws acm describe-certificate --certificate-arn $cert_arn --region us-east-1
        echo ""
        echo "After DNS validation is complete, update your CloudFormation template with:"
        echo "CertificateArn: $cert_arn"
    else
        echo "❌ Failed to request certificate"
    fi
}

# Platform-specific SSL setup
setup_platform_ssl() {
    local platform=$1
    
    case $platform in
        "vercel")
            echo "🔸 Vercel SSL Configuration"
            echo "Vercel automatically handles SSL certificates for custom domains."
            echo "After adding your domain with 'vercel domains add $DOMAIN',"
            echo "SSL will be provisioned automatically within minutes."
            ;;
        "netlify")
            echo "🔸 Netlify SSL Configuration" 
            echo "Netlify automatically provisions SSL certificates for custom domains."
            echo "After configuring DNS, SSL will be available within minutes."
            ;;
        "aws")
            setup_aws_ssl
            ;;
        "docker"|"vps")
            setup_letsencrypt
            ;;
        "cloudflare")
            setup_cloudflare_ssl
            ;;
        *)
            echo "Unknown platform: $platform"
            ;;
    esac
}

# Main execution
if check_ssl; then
    echo "SSL certificate is already properly configured!"
else
    echo ""
    echo "Select SSL setup method:"
    echo "1) Let's Encrypt (for Docker/VPS)"
    echo "2) AWS Certificate Manager" 
    echo "3) CloudFlare SSL"
    echo "4) Vercel (automatic)"
    echo "5) Netlify (automatic)"
    echo ""
    read -p "Choose option (1-5): " ssl_choice
    
    case $ssl_choice in
        1) setup_platform_ssl "docker" ;;
        2) setup_platform_ssl "aws" ;;
        3) setup_platform_ssl "cloudflare" ;;
        4) setup_platform_ssl "vercel" ;;
        5) setup_platform_ssl "netlify" ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
fi

# Final SSL verification
echo ""
echo "🔍 Final SSL verification..."
sleep 5  # Wait a moment for changes to propagate

if check_ssl; then
    echo ""
    echo "🎉 SSL setup completed successfully!"
    echo "✅ $DOMAIN is secured with SSL"
    
    # Test HTTPS redirect
    echo ""
    echo "Testing HTTPS redirect..."
    local redirect_status=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
    if [ "$redirect_status" = "301" ] || [ "$redirect_status" = "302" ]; then
        echo "✅ HTTP to HTTPS redirect working"
    else
        echo "⚠️  HTTP redirect status: $redirect_status"
    fi
    
else
    echo ""
    echo "⚠️  SSL certificate setup may still be in progress"
    echo "Please wait a few minutes and check again with:"
    echo "openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"
fi

echo ""
echo "🔒 SSL Configuration Summary:"
echo "============================"
echo "Domain: $DOMAIN"
echo "Status: $(check_ssl && echo "✅ Active" || echo "⏳ Pending")"
echo ""
echo "Security headers test:"
echo "curl -I https://$DOMAIN | grep -i 'strict-transport-security\\|x-frame-options\\|x-content-type'"