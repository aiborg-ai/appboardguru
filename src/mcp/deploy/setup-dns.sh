#!/bin/bash
set -e

# BoardGuru DNS Setup Script
# Sets up DNS records for demo.boardguru.ai

DOMAIN="demo.boardguru.ai"
ROOT_DOMAIN="boardguru.ai"

echo "🌐 Setting up DNS for $DOMAIN"
echo "================================"

# Check if dig is available for DNS verification
if ! command -v dig &> /dev/null; then
    echo "Installing dig for DNS verification..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install bind
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y dnsutils
    fi
fi

# Function to check DNS propagation
check_dns() {
    local record_type=$1
    local expected_value=$2
    
    echo "Checking $record_type record for $DOMAIN..."
    local result=$(dig +short $DOMAIN $record_type 2>/dev/null || echo "")
    
    if [[ "$result" == *"$expected_value"* ]]; then
        echo "✅ $record_type record found: $result"
        return 0
    else
        echo "⏳ $record_type record not found or incorrect. Current: $result"
        return 1
    fi
}

# Platform-specific DNS setup
setup_vercel_dns() {
    echo "🔸 Setting up DNS for Vercel deployment..."
    
    echo "Required DNS records for Vercel:"
    echo "================================"
    echo "Type: CNAME"
    echo "Name: demo"
    echo "Value: cname.vercel-dns.com"
    echo ""
    echo "Or if using A record:"
    echo "Type: A"
    echo "Name: demo"  
    echo "Value: 76.76.19.61"
    echo ""
    
    # Check if domain is already configured
    if check_dns "A" "76.76.19.61" || check_dns "CNAME" "cname.vercel-dns.com"; then
        echo "✅ DNS appears to be configured for Vercel"
    else
        echo "⚠️  Please configure DNS records manually in your domain provider"
        echo "Then run: vercel domains add $DOMAIN"
    fi
}

setup_netlify_dns() {
    echo "🔸 Setting up DNS for Netlify deployment..."
    
    echo "Required DNS records for Netlify:"
    echo "================================="
    echo "Type: CNAME"
    echo "Name: demo"
    echo "Value: [your-site-name].netlify.app"
    echo ""
    echo "Or Netlify Load Balancer IPs:"
    echo "Type: A"
    echo "Name: demo"
    echo "Value: 75.2.60.5"
    echo ""
    
    if check_dns "A" "75.2.60.5"; then
        echo "✅ DNS appears to be configured for Netlify"
    else
        echo "⚠️  Please configure DNS records manually"
    fi
}

setup_aws_dns() {
    echo "🔸 Setting up DNS for AWS CloudFront..."
    
    # Get CloudFront distribution domain from CloudFormation
    if command -v aws &> /dev/null; then
        STACK_NAME="boardguru-demo-production"
        CF_DOMAIN=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$CF_DOMAIN" ]; then
            echo "CloudFront Domain: $CF_DOMAIN"
            echo ""
            echo "Required DNS records:"
            echo "===================="
            echo "Type: CNAME"
            echo "Name: demo"
            echo "Value: $CF_DOMAIN"
            echo ""
            
            if check_dns "CNAME" "$CF_DOMAIN"; then
                echo "✅ DNS configured correctly for AWS"
            else
                echo "⚠️  Please update DNS to point to CloudFront distribution"
            fi
        else
            echo "⚠️  CloudFormation stack not found or not deployed yet"
        fi
    else
        echo "⚠️  AWS CLI not found. Please configure DNS manually to point to CloudFront distribution"
    fi
}

setup_docker_dns() {
    echo "🔸 Setting up DNS for Docker deployment..."
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo "Required DNS records for Docker deployment:"
    echo "=========================================="
    echo "Type: A"
    echo "Name: demo"
    echo "Value: $SERVER_IP"
    echo ""
    
    if [ "$SERVER_IP" != "YOUR_SERVER_IP" ]; then
        if check_dns "A" "$SERVER_IP"; then
            echo "✅ DNS configured correctly for Docker"
        else
            echo "⚠️  Please update DNS to point to your server: $SERVER_IP"
        fi
    fi
}

# Main menu
echo "Select deployment platform for DNS setup:"
echo "1) Vercel"
echo "2) Netlify" 
echo "3) AWS CloudFront"
echo "4) Docker/VPS"
echo "5) Check current DNS status"
echo ""
read -p "Choose option (1-5): " choice

case $choice in
    1) setup_vercel_dns ;;
    2) setup_netlify_dns ;;
    3) setup_aws_dns ;;
    4) setup_docker_dns ;;
    5)
        echo "🔍 Current DNS status for $DOMAIN:"
        echo "=================================="
        dig $DOMAIN A +short
        dig $DOMAIN CNAME +short
        dig $DOMAIN MX +short
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# SSL Certificate check
echo ""
echo "🔒 Checking SSL certificate status..."
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    echo "✅ SSL certificate is active"
else
    echo "⚠️  SSL certificate not found or invalid"
    echo "Most platforms handle SSL automatically after DNS is configured"
fi

echo ""
echo "🎯 DNS Setup Summary:"
echo "===================="
echo "Domain: $DOMAIN"
echo "Status: Configuration in progress"
echo ""
echo "Next steps:"
echo "1. Wait for DNS propagation (5-15 minutes)"
echo "2. Verify SSL certificate is issued"
echo "3. Test the demo site functionality"
echo "4. Set up monitoring alerts"
echo ""
echo "Test when ready:"
echo "curl -I https://$DOMAIN"