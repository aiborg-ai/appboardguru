# Test Fixtures

This directory contains test files used in E2E testing.

## Required Test Files

The following files should be created for comprehensive testing:

### PDF Files
- `sample.pdf` - A standard PDF document for basic upload tests
- `large-sample.pdf` - A larger PDF (5MB+) for performance testing
- `sample1.pdf`, `sample2.pdf`, `sample3.pdf` - Multiple PDFs for bulk testing

### Office Documents
- `sample.docx` - A Word document
- `sample.xlsx` - An Excel spreadsheet
- `sample.pptx` - A PowerPoint presentation

### Invalid Files
- `invalid.exe` - An executable file (should be rejected)
- `suspicious.pdf.exe` - A file with double extension (security test)

### Large Files
- `large-sample.pdf` - For upload progress and cancellation testing

## Creating Test Files

You can create these files manually or use scripts:

```bash
# Create sample PDF (requires tools like pandoc or similar)
echo "Sample PDF Content" > sample.txt
pandoc sample.txt -o sample.pdf

# Create empty test files for basic testing
touch sample.pdf sample.docx sample.xlsx sample.pptx
touch sample1.pdf sample2.pdf sample3.pdf

# Create invalid files
echo "fake exe" > invalid.exe
echo "fake pdf" > suspicious.pdf.exe
```

## File Size Guidelines

- Small files (< 1MB): For basic upload tests
- Medium files (1-5MB): For standard performance tests  
- Large files (> 5MB): For progress tracking and cancellation tests

## Security Testing

Some files are intentionally created for security testing:
- Files with suspicious extensions
- Files with malicious-looking names
- Files that should be rejected by the upload system

These files help ensure the application properly validates uploads and prevents security issues.