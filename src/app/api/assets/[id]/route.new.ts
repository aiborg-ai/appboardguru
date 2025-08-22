/**
 * GET/PUT/DELETE /api/assets/[id]
 * Delegates to AssetController
 */

export { 
  getAsset as GET,
  updateAsset as PUT,
  deleteAsset as DELETE
} from '../../controllers/asset.controller'