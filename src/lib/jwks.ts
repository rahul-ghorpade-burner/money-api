import { createPublicKey } from 'crypto'
import { env } from './env.js'

let cachedPublicKey: string | null = null

export async function getSupabasePublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`)
  }

  const { keys } = await response.json() as { keys: JsonWebKey[] }
  const key = keys[0]
  if (!key) throw new Error('No keys found in JWKS')

  const publicKey = createPublicKey({ key, format: 'jwk' })
  cachedPublicKey = publicKey.export({ type: 'spki', format: 'pem' }) as string
  return cachedPublicKey
}
