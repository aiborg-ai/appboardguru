import { NextRequest } from 'next/server'
import { fyiController } from '@/lib/api/controllers/fyi.controller'

export async function POST(request: NextRequest) {
  return await fyiController.logInteraction(request)
}