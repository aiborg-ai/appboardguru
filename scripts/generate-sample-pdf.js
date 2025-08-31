const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Sample annual report data
const reports = [
  {
    filename: 'Apple_Inc_2023_Annual_Report.pdf',
    company: 'Apple Inc.',
    year: 2023,
    content: `
APPLE INC.
2023 ANNUAL REPORT

To our shareholders,

Fiscal year 2023 was a remarkable year for Apple. Despite facing macroeconomic headwinds, we achieved revenue of $383.3 billion and continued to innovate across our entire product line.

KEY HIGHLIGHTS:
• Revenue: $383.3 billion
• Net Income: $97.0 billion
• iPhone revenue: $200.6 billion
• Services revenue: $85.2 billion
• Wearables revenue: $39.8 billion

Our commitment to innovation remains unwavering. The launch of Apple Vision Pro marks our entry into spatial computing, while our continued investment in Apple Silicon has transformed the Mac lineup.

Environmental Progress:
We remain committed to our goal of becoming carbon neutral across our entire supply chain by 2030. This year, we made significant progress in renewable energy adoption and recycling initiatives.

Looking Forward:
As we enter fiscal 2024, we remain focused on creating products that enrich people's lives while maintaining our commitment to privacy, environmental responsibility, and accessibility.

Tim Cook
CEO, Apple Inc.
    `
  },
  {
    filename: 'Microsoft_Corporation_2023_Annual_Report.pdf',
    company: 'Microsoft Corporation',
    year: 2023,
    content: `
MICROSOFT CORPORATION
2023 ANNUAL REPORT

Dear shareholders,

Fiscal Year 2023 was a pivotal year for Microsoft as we continued to lead in the era of AI transformation while delivering strong financial results.

FINANCIAL HIGHLIGHTS:
• Total Revenue: $211.9 billion (up 7%)
• Operating Income: $88.5 billion
• Cloud Revenue: $111.6 billion
• Office 365 subscribers: 400+ million
• Azure growth: 27% year-over-year

AI LEADERSHIP:
Our partnership with OpenAI and integration of AI across our entire product portfolio positions us at the forefront of the AI revolution. Copilot is transforming how millions work with Office 365.

Cloud Excellence:
Azure continues to gain market share, becoming the platform of choice for AI workloads. Our intelligent cloud segment delivered outstanding results.

Gaming & Entertainment:
With the acquisition of Activision Blizzard, we're positioned to lead in gaming across console, PC, and mobile platforms.

Satya Nadella
Chairman and CEO
    `
  }
];

// Function to create a simple PDF
function createPDF(reportData) {
  const outputPath = path.join(__dirname, '..', 'public', 'assets', 'annual-reports', reportData.filename);
  
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(outputPath);
  
  doc.pipe(stream);
  
  // Add content
  doc.fontSize(24)
     .text(reportData.company, { align: 'center' })
     .moveDown();
  
  doc.fontSize(18)
     .text(`${reportData.year} Annual Report`, { align: 'center' })
     .moveDown(2);
  
  doc.fontSize(12)
     .text(reportData.content, {
       align: 'left',
       lineGap: 5
     });
  
  doc.end();
  
  return new Promise((resolve) => {
    stream.on('finish', () => {
      console.log(`Created: ${reportData.filename}`);
      resolve();
    });
  });
}

// Create PDFs
async function generateReports() {
  for (const report of reports) {
    await createPDF(report);
  }
  console.log('All PDF reports generated successfully!');
}

generateReports().catch(console.error);