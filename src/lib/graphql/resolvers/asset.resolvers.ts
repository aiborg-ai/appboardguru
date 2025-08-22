/**
 * Asset GraphQL Resolvers
 * Handles all asset-related queries and mutations with proper authorization
 */

import { GraphQLError } from 'graphql'
import { GraphQLContext, AssetFilters, PaginationInput } from '../types'
import { AssetService } from '../../services/asset.service'
import { createDataLoader } from '../dataloaders'
import { validateAssetAccess, validateAssetEdit } from '../middleware/permissions'

const assetService = new AssetService()

export const assetResolvers = {
  Query: {
    async asset(parent: any, args: { id: string }, context: GraphQLContext) {
      try {
        const asset = await assetService.getAssetById(args.id)
        if (!asset.success || !asset.data) {
          throw new GraphQLError('Asset not found', {
            extensions: { code: 'ASSET_NOT_FOUND' }
          })
        }

        // Check if user has access to this asset
        await validateAssetAccess(context.user, asset.data)
        
        return asset.data
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to fetch asset', {
          extensions: { code: 'INTERNAL_ERROR' }
        })
      }
    },

    async assets(parent: any, args: { filters?: AssetFilters; pagination?: PaginationInput }, context: GraphQLContext) {
      try {
        const { filters = {}, pagination = { page: 1, limit: 20 } } = args
        
        // Apply user's organization filter if not specified and user is not super admin
        if (!filters.organizationId && context.user.role !== 'SUPER_ADMIN') {
          const userOrganizations = await context.dataloaders.userOrganizations.load(context.user.id)
          if (userOrganizations.length === 0) {
            return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }
          }
          filters.organizationId = userOrganizations[0].id
        }

        const result = await assetService.getAssets(filters, pagination)
        if (!result.success) {
          throw new GraphQLError('Failed to fetch assets')
        }

        const { data, pagination: paginationInfo } = result.data!
        
        return {
          edges: data.map((asset, index) => ({
            node: asset,
            cursor: Buffer.from(`${pagination.page}:${index}`).toString('base64')
          })),
          pageInfo: {
            hasNextPage: paginationInfo.page < paginationInfo.totalPages,
            hasPreviousPage: paginationInfo.page > 1,
            startCursor: data.length > 0 ? Buffer.from(`${pagination.page}:0`).toString('base64') : null,
            endCursor: data.length > 0 ? Buffer.from(`${pagination.page}:${data.length - 1}`).toString('base64') : null
          },
          totalCount: paginationInfo.total
        }
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to fetch assets')
      }
    },

    async assetsByVault(parent: any, args: { vaultId: string; pagination?: PaginationInput }, context: GraphQLContext) {
      try {
        const { vaultId, pagination = { page: 1, limit: 20 } } = args
        
        // Check if user has access to the vault
        const vault = await context.dataloaders.vault.load(vaultId)
        if (!vault) {
          throw new GraphQLError('Vault not found', {
            extensions: { code: 'VAULT_NOT_FOUND' }
          })
        }

        const result = await assetService.getAssetsByVault(vaultId, pagination)
        if (!result.success) {
          throw new GraphQLError('Failed to fetch vault assets')
        }

        const { data, pagination: paginationInfo } = result.data!
        
        return {
          edges: data.map((asset, index) => ({
            node: asset,
            cursor: Buffer.from(`${pagination.page}:${index}`).toString('base64')
          })),
          pageInfo: {
            hasNextPage: paginationInfo.page < paginationInfo.totalPages,
            hasPreviousPage: paginationInfo.page > 1,
            startCursor: data.length > 0 ? Buffer.from(`${pagination.page}:0`).toString('base64') : null,
            endCursor: data.length > 0 ? Buffer.from(`${pagination.page}:${data.length - 1}`).toString('base64') : null
          },
          totalCount: paginationInfo.total
        }
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to fetch vault assets')
      }
    },

    async searchAssets(parent: any, args: { query: string; filters?: AssetFilters; pagination?: PaginationInput }, context: GraphQLContext) {
      try {
        const { query, filters = {}, pagination = { page: 1, limit: 20 } } = args
        
        // Apply user's organization filter if not specified and user is not super admin
        if (!filters.organizationId && context.user.role !== 'SUPER_ADMIN') {
          const userOrganizations = await context.dataloaders.userOrganizations.load(context.user.id)
          if (userOrganizations.length > 0) {
            filters.organizationId = userOrganizations[0].id
          }
        }

        const result = await assetService.searchAssets(query, filters, pagination)
        if (!result.success) {
          throw new GraphQLError('Failed to search assets')
        }

        const { data, pagination: paginationInfo } = result.data!
        
        return {
          edges: data.map((asset, index) => ({
            node: asset,
            cursor: Buffer.from(`${pagination.page}:${index}`).toString('base64')
          })),
          pageInfo: {
            hasNextPage: paginationInfo.page < paginationInfo.totalPages,
            hasPreviousPage: paginationInfo.page > 1,
            startCursor: data.length > 0 ? Buffer.from(`${pagination.page}:0`).toString('base64') : null,
            endCursor: data.length > 0 ? Buffer.from(`${pagination.page}:${data.length - 1}`).toString('base64') : null
          },
          totalCount: paginationInfo.total
        }
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to search assets')
      }
    },
  },

  Mutation: {
    async createAsset(parent: any, args: { input: any; file: any }, context: GraphQLContext) {
      try {
        const { input, file } = args
        
        // Validate organization access
        const organization = await context.dataloaders.organization.load(input.organizationId)
        if (!organization) {
          throw new GraphQLError('Organization not found')
        }

        // Check if user can create assets in this organization
        const isMember = await context.dataloaders.organizationMember.load({
          organizationId: input.organizationId,
          userId: context.user.id
        })
        
        if (!isMember && context.user.role !== 'SUPER_ADMIN') {
          throw new GraphQLError('Insufficient permissions to create asset in this organization')
        }

        const result = await assetService.createAsset({
          ...input,
          uploaderId: context.user.id,
          file
        })

        if (!result.success) {
          throw new GraphQLError(result.error || 'Failed to create asset')
        }

        // Invalidate relevant caches
        context.dataloaders.clearAssetCaches(input.organizationId)

        return result.data
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to create asset')
      }
    },

    async updateAsset(parent: any, args: { id: string; input: any }, context: GraphQLContext) {
      try {
        const { id, input } = args
        
        const asset = await context.dataloaders.asset.load(id)
        if (!asset) {
          throw new GraphQLError('Asset not found')
        }

        await validateAssetEdit(context.user, asset)

        const result = await assetService.updateAsset(id, input)
        if (!result.success) {
          throw new GraphQLError(result.error || 'Failed to update asset')
        }

        // Invalidate caches
        context.dataloaders.asset.clear(id)
        context.dataloaders.clearAssetCaches(asset.organizationId)

        return result.data
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to update asset')
      }
    },

    async deleteAsset(parent: any, args: { id: string }, context: GraphQLContext) {
      try {
        const asset = await context.dataloaders.asset.load(args.id)
        if (!asset) {
          throw new GraphQLError('Asset not found')
        }

        await validateAssetEdit(context.user, asset)

        const result = await assetService.deleteAsset(args.id)
        if (!result.success) {
          throw new GraphQLError(result.error || 'Failed to delete asset')
        }

        // Invalidate caches
        context.dataloaders.asset.clear(args.id)
        context.dataloaders.clearAssetCaches(asset.organizationId)

        return true
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to delete asset')
      }
    },

    async shareAsset(parent: any, args: { input: any }, context: GraphQLContext) {
      try {
        const { input } = args
        
        const asset = await context.dataloaders.asset.load(input.assetId)
        if (!asset) {
          throw new GraphQLError('Asset not found')
        }

        await validateAssetEdit(context.user, asset)

        const result = await assetService.shareAsset({
          ...input,
          sharedBy: context.user.id
        })

        if (!result.success) {
          throw new GraphQLError(result.error || 'Failed to share asset')
        }

        return true
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to share asset')
      }
    },

    async addAssetToVault(parent: any, args: { assetId: string; vaultId: string }, context: GraphQLContext) {
      try {
        const { assetId, vaultId } = args
        
        const [asset, vault] = await Promise.all([
          context.dataloaders.asset.load(assetId),
          context.dataloaders.vault.load(vaultId)
        ])

        if (!asset) throw new GraphQLError('Asset not found')
        if (!vault) throw new GraphQLError('Vault not found')

        await validateAssetEdit(context.user, asset)

        const result = await assetService.addAssetToVault(assetId, vaultId)
        if (!result.success) {
          throw new GraphQLError(result.error || 'Failed to add asset to vault')
        }

        // Invalidate caches
        context.dataloaders.clearVaultAssets(vaultId)

        return true
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to add asset to vault')
      }
    },

    async removeAssetFromVault(parent: any, args: { assetId: string; vaultId: string }, context: GraphQLContext) {
      try {
        const { assetId, vaultId } = args
        
        const [asset, vault] = await Promise.all([
          context.dataloaders.asset.load(assetId),
          context.dataloaders.vault.load(vaultId)
        ])

        if (!asset) throw new GraphQLError('Asset not found')
        if (!vault) throw new GraphQLError('Vault not found')

        await validateAssetEdit(context.user, asset)

        const result = await assetService.removeAssetFromVault(assetId, vaultId)
        if (!result.success) {
          throw new GraphQLError(result.error || 'Failed to remove asset from vault')
        }

        // Invalidate caches
        context.dataloaders.clearVaultAssets(vaultId)

        return true
      } catch (error) {
        if (error instanceof GraphQLError) throw error
        throw new GraphQLError('Failed to remove asset from vault')
      }
    },
  },

  Asset: {
    async uploader(parent: any, args: any, context: GraphQLContext) {
      return context.dataloaders.user.load(parent.uploaderId)
    },

    async organization(parent: any, args: any, context: GraphQLContext) {
      return context.dataloaders.organization.load(parent.organizationId)
    },

    async annotations(parent: any, args: any, context: GraphQLContext) {
      return context.dataloaders.assetAnnotations.load(parent.id)
    },

    async permissions(parent: any, args: any, context: GraphQLContext) {
      return context.dataloaders.assetPermissions.load(parent.id)
    },

    async vaults(parent: any, args: any, context: GraphQLContext) {
      return context.dataloaders.assetVaults.load(parent.id)
    },

    // Computed fields
    async viewCount(parent: any, args: any, context: GraphQLContext) {
      const metrics = await context.dataloaders.assetMetrics.load(parent.id)
      return metrics?.viewCount || 0
    },

    async downloadCount(parent: any, args: any, context: GraphQLContext) {
      const metrics = await context.dataloaders.assetMetrics.load(parent.id)
      return metrics?.downloadCount || 0
    },

    async commentCount(parent: any, args: any, context: GraphQLContext) {
      const annotations = await context.dataloaders.assetAnnotations.load(parent.id)
      return annotations.filter(a => a.commentText).length
    },

    async canView(parent: any, args: any, context: GraphQLContext) {
      try {
        await validateAssetAccess(context.user, parent)
        return true
      } catch {
        return false
      }
    },

    async canEdit(parent: any, args: any, context: GraphQLContext) {
      try {
        await validateAssetEdit(context.user, parent)
        return true
      } catch {
        return false
      }
    },

    async canDownload(parent: any, args: any, context: GraphQLContext) {
      const permissions = await context.dataloaders.assetUserPermissions.load({
        assetId: parent.id,
        userId: context.user.id
      })
      return permissions?.canDownload || parent.uploaderId === context.user.id
    },
  },

  AssetConnection: {
    edges: (parent: any) => parent.edges,
    pageInfo: (parent: any) => parent.pageInfo,
    totalCount: (parent: any) => parent.totalCount,
  },

  AssetEdge: {
    node: (parent: any) => parent.node,
    cursor: (parent: any) => parent.cursor,
  },

  PageInfo: {
    hasNextPage: (parent: any) => parent.hasNextPage,
    hasPreviousPage: (parent: any) => parent.hasPreviousPage,
    startCursor: (parent: any) => parent.startCursor,
    endCursor: (parent: any) => parent.endCursor,
  },
}