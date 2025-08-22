/**
 * GET/POST /api/assets
 * Delegates to AssetController
 */

export { 
  listAssets as GET,
  createAsset as POST 
} from '../controllers/asset.controller'