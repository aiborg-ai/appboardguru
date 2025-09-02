import { pdfjs } from 'react-pdf';

// Configure PDF.js worker
// Using local worker file to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Note: The pdf.worker.min.js file is served from the public folder
// This avoids CORS issues that occur when loading from CDNs

export default pdfjs;