#!/bin/bash
set -e

# BoardGuru MCP Demo Deployment Script
# Usage: ./deploy.sh [platform] [environment]
# Platforms: vercel, netlify, aws, docker
# Environments: staging, production

PLATFORM=${1:-vercel}
ENVIRONMENT=${2:-production}
DOMAIN="demo.boardguru.ai"

echo "🚀 Deploying BoardGuru MCP Demo to $PLATFORM ($ENVIRONMENT)"
echo "======================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from project root."
    exit 1
fi

# Build the demo
echo "📦 Building demo application..."
npm run build:demo || {
    echo "❌ Build failed. Fixing TypeScript timeout..."
    # Increase Node.js memory for build
    NODE_OPTIONS="--max_old_space_size=4096" npm run build:demo
}

case $PLATFORM in
    "vercel")
        echo "🔸 Deploying to Vercel..."
        
        # Install Vercel CLI if not present
        if ! command -v vercel &> /dev/null; then
            npm install -g vercel
        fi
        
        # Set environment variables
        echo "Setting up environment variables..."
        vercel env add NODE_ENV $ENVIRONMENT --token=$VERCEL_TOKEN || true
        vercel env add DEMO_MODE true --token=$VERCEL_TOKEN || true
        vercel env add NEXT_PUBLIC_APP_URL https://$DOMAIN --token=$VERCEL_TOKEN || true
        
        # Deploy
        if [ "$ENVIRONMENT" = "production" ]; then
            vercel --prod --confirm --token=$VERCEL_TOKEN
            echo "✅ Deployed to production: https://$DOMAIN"
        else
            vercel --token=$VERCEL_TOKEN
            echo "✅ Deployed to staging"
        fi
        ;;
        
    "netlify")
        echo "🔸 Deploying to Netlify..."
        
        # Install Netlify CLI if not present
        if ! command -v netlify &> /dev/null; then
            npm install -g netlify-cli
        fi
        
        # Deploy
        if [ "$ENVIRONMENT" = "production" ]; then
            netlify deploy --prod --dir=demo/public --functions=demo
            echo "✅ Deployed to production: https://$DOMAIN"
        else
            netlify deploy --dir=demo/public --functions=demo
            echo "✅ Deployed to staging"
        fi
        ;;
        
    "aws")
        echo "🔸 Deploying to AWS with CloudFormation..."
        
        # Check AWS CLI
        if ! command -v aws &> /dev/null; then
            echo "❌ AWS CLI not found. Please install and configure AWS CLI."
            exit 1
        fi
        
        # Validate CloudFormation template
        echo "Validating CloudFormation template..."
        aws cloudformation validate-template --template-body file://deploy/aws-cloudformation.yaml
        
        # Deploy stack
        STACK_NAME="boardguru-demo-${ENVIRONMENT}"
        aws cloudformation deploy \
            --template-file deploy/aws-cloudformation.yaml \
            --stack-name $STACK_NAME \
            --parameter-overrides \
                DomainName=$DOMAIN \
                Environment=$ENVIRONMENT \
                CertificateArn=$AWS_CERTIFICATE_ARN \
            --capabilities CAPABILITY_IAM \
            --region us-east-1
            
        # Get outputs
        aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs' \
            --output table
            
        echo "✅ AWS deployment completed"
        ;;
        
    "docker")
        echo "🔸 Deploying with Docker Compose..."
        
        # Build and start containers
        docker-compose -f deploy/docker-compose.prod.yml build
        docker-compose -f deploy/docker-compose.prod.yml up -d
        
        # Wait for services to be healthy
        echo "Waiting for services to be healthy..."
        timeout 300 bash -c 'until docker-compose -f deploy/docker-compose.prod.yml ps | grep -q "healthy"; do sleep 5; done'
        
        echo "✅ Docker deployment completed"
        echo "🔗 Local access: https://localhost"
        ;;
        
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "Supported platforms: vercel, netlify, aws, docker"
        exit 1
        ;;
esac

# Health check
echo ""
echo "🔍 Running health checks..."
if [ "$PLATFORM" != "docker" ]; then
    curl -f https://$DOMAIN/health > /dev/null 2>&1 && {
        echo "✅ Health check passed: https://$DOMAIN/health"
    } || {
        echo "⚠️  Health check failed - site may still be starting up"
    }
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "🔗 Demo URL: https://$DOMAIN"
echo "📊 Admin Dashboard: https://$DOMAIN/admin"
echo "📚 API Documentation: https://$DOMAIN/docs"
echo ""
echo "Next steps:"
echo "1. Configure DNS records for $DOMAIN"
echo "2. Set up SSL certificates"
echo "3. Configure monitoring alerts"
echo "4. Run integration tests"