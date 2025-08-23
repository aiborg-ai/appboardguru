import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/collaboration/swagger-ui
 * Serve Swagger UI for interactive API documentation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const specUrl = `${baseUrl}/api/collaboration/docs?format=json`

  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BoardGuru Collaboration API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@4.15.5/favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@4.15.5/favicon-16x16.png" sizes="16x16" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #1976d2;
    }
    .swagger-ui .topbar .download-url-wrapper .download-url-button {
      background: #3f51b5;
    }
    .swagger-ui .info .title {
      color: #1976d2;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      // Initialize Swagger UI
      const ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        filter: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: function() {
          console.log('BoardGuru Collaboration API Documentation loaded successfully');
        },
        onFailure: function(error) {
          console.error('Failed to load API documentation:', error);
        },
        docExpansion: 'list',
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        showExtensions: true,
        showCommonExtensions: true,
        requestInterceptor: function(request) {
          // Add custom headers if needed
          request.headers['X-API-Client'] = 'BoardGuru-Swagger-UI';
          return request;
        },
        responseInterceptor: function(response) {
          // Log API responses for debugging
          if (response.status >= 400) {
            console.warn('API Error:', response);
          }
          return response;
        }
      });
      
      // Custom styling and behavior
      setTimeout(function() {
        // Add custom logo or branding
        const topbar = document.querySelector('.swagger-ui .topbar');
        if (topbar) {
          const logo = document.createElement('div');
          logo.innerHTML = '<h3 style="color: white; margin: 0; padding: 10px;">BoardGuru Collaboration API</h3>';
          topbar.prepend(logo);
        }
        
        // Add version info
        const info = document.querySelector('.swagger-ui .info');
        if (info) {
          const versionBadge = document.createElement('div');
          versionBadge.innerHTML = '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;">v1.0.0</span>';
          const title = info.querySelector('.title');
          if (title) {
            title.appendChild(versionBadge);
          }
        }
      }, 1000);
    };
  </script>
</body>
</html>
  `

  return new NextResponse(swaggerHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    }
  })
}