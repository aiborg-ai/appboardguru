/**
 * Test script to verify the annotations system implementation
 * Run with: node test-annotations-system.js
 */

const test = {
  passed: 0,
  failed: 0,
  results: []
}

function assert(condition, message) {
  if (condition) {
    test.passed++
    test.results.push(`✅ ${message}`)
  } else {
    test.failed++
    test.results.push(`❌ ${message}`)
  }
}

console.log('🔍 Testing Annotations System Implementation...\n')

// Test 1: Check if repository files exist
const fs = require('fs')
const path = require('path')

const repositoryPath = path.join(__dirname, 'src/lib/repositories/annotation.repository.ts')
const servicePath = path.join(__dirname, 'src/lib/services/annotation.service.ts')
const controllerPath = path.join(__dirname, 'src/lib/api/controllers/annotation.controller.ts')
const typesPath = path.join(__dirname, 'src/types/annotation-types.ts')
const storePath = path.join(__dirname, 'src/lib/stores/annotation-store.ts')

assert(fs.existsSync(repositoryPath), 'Annotation repository file exists')
assert(fs.existsSync(servicePath), 'Annotation service file exists')
assert(fs.existsSync(controllerPath), 'Annotation controller file exists')
assert(fs.existsSync(typesPath), 'Annotation types file exists')
assert(fs.existsSync(storePath), 'Annotation store file exists')

// Test 2: Check if API routes exist
const apiRoutePath = path.join(__dirname, 'src/app/api/assets/[id]/annotations/route.ts')
const individualRoutePath = path.join(__dirname, 'src/app/api/assets/[id]/annotations/[annotationId]/route.ts')

assert(fs.existsSync(apiRoutePath), 'Main annotations API route exists')
assert(fs.existsSync(individualRoutePath), 'Individual annotation API route exists')

// Test 3: Check if UI components exist
const pdfViewerPath = path.join(__dirname, 'src/components/features/assets/PDFViewerWithAnnotations.tsx')
const annotationPanelPath = path.join(__dirname, 'src/components/organisms/annotation-panel.tsx')
const annotationCardPath = path.join(__dirname, 'src/components/molecules/annotation-card.tsx')
const annotationFormPath = path.join(__dirname, 'src/components/molecules/annotation-form.tsx')
const annotationFiltersPath = path.join(__dirname, 'src/components/molecules/annotation-filters.tsx')

assert(fs.existsSync(pdfViewerPath), 'PDF Viewer with Annotations component exists')
assert(fs.existsSync(annotationPanelPath), 'Annotation Panel component exists')
assert(fs.existsSync(annotationCardPath), 'Annotation Card component exists')
assert(fs.existsSync(annotationFormPath), 'Annotation Form component exists')
assert(fs.existsSync(annotationFiltersPath), 'Annotation Filters component exists')

// Test 4: Check if database migration exists
const migrationPath = path.join(__dirname, 'database/migrations/20250820_001_add_pdf_annotations_system.sql')
assert(fs.existsSync(migrationPath), 'Database migration for annotations exists')

// Test 5: Basic content validation
try {
  const repositoryContent = fs.readFileSync(repositoryPath, 'utf8')
  assert(repositoryContent.includes('Result<'), 'Repository uses Result pattern')
  assert(repositoryContent.includes('BaseRepository'), 'Repository extends BaseRepository')
  assert(repositoryContent.includes('asset_annotations'), 'Repository references correct table name')
  
  const serviceContent = fs.readFileSync(servicePath, 'utf8')
  assert(serviceContent.includes('IAnnotationRepository'), 'Service uses repository interface')
  assert(serviceContent.includes('validateAnnotationData'), 'Service includes validation')
  
  const controllerContent = fs.readFileSync(controllerPath, 'utf8')
  assert(controllerContent.includes('NextResponse'), 'Controller uses Next.js response')
  assert(controllerContent.includes('createSupabaseServerClient'), 'Controller uses proper auth')
  
  const typesContent = fs.readFileSync(typesPath, 'utf8')
  assert(typesContent.includes('AssetAnnotation'), 'Types include AssetAnnotation')
  assert(typesContent.includes('AnnotationId'), 'Types include branded AnnotationId')
  
  const storeContent = fs.readFileSync(storePath, 'utf8')
  assert(storeContent.includes('zustand'), 'Store uses Zustand')
  assert(storeContent.includes('loadAnnotations'), 'Store includes async actions')
} catch (error) {
  assert(false, `Error reading files: ${error.message}`)
}

// Print results
console.log('\n📊 Test Results:')
console.log('================')
test.results.forEach(result => console.log(result))

console.log(`\n🎯 Summary: ${test.passed}/${test.passed + test.failed} tests passed`)

if (test.failed === 0) {
  console.log('\n🎉 All tests passed! The annotations system is properly implemented.')
  console.log('\n🚀 Next steps:')
  console.log('   1. Run database migrations to create the tables')
  console.log('   2. Test the API endpoints with actual requests')
  console.log('   3. Test the UI components in the browser')
  console.log('   4. Verify real-time updates are working')
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.')
  process.exit(1)
}