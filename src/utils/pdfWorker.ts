import { pdfjs } from 'react-pdf';

// Configure PDF.js worker
// Using the CDN version to avoid build issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Alternative: Use local worker (requires copying worker file to public folder)
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default pdfjs;