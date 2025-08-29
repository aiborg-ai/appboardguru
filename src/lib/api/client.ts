"use client"

import { createSupabaseBrowserClient } from '@/lib/supabase-client'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText?: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const apiClient = {
  async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const supabase = createSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (session?.access_token) {
      defaultHeaders['Authorization'] = `Bearer ${session.access_token}`
    }

    const config: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new ApiError(
          data.message || data.error || 'Request failed',
          response.status,
          response.statusText,
          data
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      )
    }
  },

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' })
  },

  async post<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async put<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async patch<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async delete<T>(url: string, options?: RequestInit): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  },
}