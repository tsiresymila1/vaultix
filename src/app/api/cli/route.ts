import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyCliToken } from '@/utils/jwt'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 })
  }

  const payload = await verifyCliToken(token)

  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
  }

  const user = { id: payload.userId, email: payload.email }
  const supabase = createAdminClient()

  try {
    const { action, params } = await req.json()

    switch (action) {
      case 'get-user-crypto': {
        const { data, error } = await supabase
          .from('users')
          .select('encrypted_private_key, master_key_salt, private_key_nonce, public_key')
          .eq('id', user.id)
          .single()
        return NextResponse.json({ data, error })
      }

      case 'get-vault-access': {
        const { vaultNameOrId } = params
        const query = supabase
          .from('vault_members')
          .select(`
            encrypted_vault_key,
            vault_id,
            vaults!inner(id, name),
            users!inner(email, public_key)
          `)
          .eq('user_id', user.id)

        if (vaultNameOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          query.eq('vault_id', vaultNameOrId)
        } else {
          query.eq('vaults.name', vaultNameOrId)
        }

        const { data, error } = await query.single()
        return NextResponse.json({ data, error })
      }

      case 'get-environment': {
        const { vaultId, envName } = params
        const { data, error } = await supabase
          .from('environments')
          .select('id')
          .eq('vault_id', vaultId)
          .ilike('name', envName)
          .single()
        return NextResponse.json({ data, error })
      }

      case 'get-secrets': {
        const { vaultId, environmentId } = params
        const { data, error } = await supabase
          .from('secrets')
          .select('key, encrypted_payload, nonce')
          .eq('vault_id', vaultId)
          .eq('environment_id', environmentId)
        return NextResponse.json({ data, error })
      }

      case 'get-user-vaults': {
        const { data, error } = await supabase
          .from('vault_members')
          .select('vault_id, vaults(name)')
          .eq('user_id', user.id)
        return NextResponse.json({ data, error })
      }

      case 'list-envs': {
        const { vaultNameOrId } = params
        
        // 1. Get vault membership
        const query = supabase
          .from('vault_members')
          .select('vault_id')
          .eq('user_id', user.id)

        if (vaultNameOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          query.eq('vault_id', vaultNameOrId)
        } else {
          // Join with vaults to find by name
          const { data: membershipData, error: memError } = await supabase
            .from('vault_members')
            .select('vault_id, vaults!inner(name)')
            .eq('user_id', user.id)
            .ilike('vaults.name', vaultNameOrId)
            .single()
          
          if (memError || !membershipData) {
            return NextResponse.json({ data: null, error: memError || { message: 'Vault not found or no access' } })
          }
          
          const { data, error } = await supabase
            .from('environments')
            .select('name')
            .eq('vault_id', membershipData.vault_id)
            .order('name', { ascending: true })
          
          return NextResponse.json({ data, error })
        }

        const { data: membershipData, error: memError } = await query.single()
        if (memError || !membershipData) {
          return NextResponse.json({ data: null, error: memError || { message: 'Vault not found or no access' } })
        }

        const { data, error } = await supabase
          .from('environments')
          .select('name')
          .eq('vault_id', membershipData.vault_id)
          .order('name', { ascending: true })
        
        return NextResponse.json({ data, error })
      }

      case 'list-vaults': {
        const { data, error } = await supabase
          .from('vault_members')
          .select('vaults(name)')
          .eq('user_id', user.id)
        
        const flattened = data?.map(d => d.vaults) || []
        return NextResponse.json({ data: flattened, error })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
