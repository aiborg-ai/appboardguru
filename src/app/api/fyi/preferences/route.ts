import { NextRequest } from 'next/server'
import { fyiController } from '@/lib/api/controllers/fyi.controller'

export async function GET(request: NextRequest) {
  return await fyiController.getUserPreferences(request)
}

export async function POST(request: NextRequest) {
  return await fyiController.updateUserPreferences(request)
}