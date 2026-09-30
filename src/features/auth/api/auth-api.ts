import { request } from '@/lib/http/http'
import { validateEnv } from '@/lib/env/env'

const baseUrl = validateEnv().VITE_API_BASE_URL

export interface LoginDto {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface MeResponse {
  sub: string
  email: string
  rol: string
}

export function loginRequest(dto: LoginDto): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', {
    baseUrl,
    method: 'POST',
    body: dto,
  })
}

export function meRequest(token: string): Promise<MeResponse> {
  return request<MeResponse>('/auth/me', {
    baseUrl,
    headers: { Authorization: `Bearer ${token}` },
  })
}
