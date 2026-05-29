/**
 * Type compatibility shim for @supabase/auth-helpers-nextjs@0.10.0 with @supabase/supabase-js@2.106+
 *
 * auth-helpers was designed for supabase-js with 3 SupabaseClient type params.
 * supabase-js 2.106+ has 5 params with a different order, causing the auth-helpers
 * generic Schema to land in the wrong slot and resolve all queries to `never`.
 *
 * This augmentation makes all auth-helpers factory functions return SupabaseClient<Database>
 * with only 1 explicit generic, letting supabase-js 2.106+ resolve the rest correctly.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

declare module '@supabase/auth-helpers-nextjs' {
  export function createRouteHandlerClient<Database>(
    context: { cookies: () => unknown },
    options?: Record<string, unknown>
  ): SupabaseClient<Database>

  export function createServerComponentClient<Database>(
    context: { cookies: () => unknown },
    options?: Record<string, unknown>
  ): SupabaseClient<Database>

  export function createClientComponentClient<Database>(
    options?: Record<string, unknown>
  ): SupabaseClient<Database>

  export function createMiddlewareClient<Database>(
    context: { req: unknown; res: unknown },
    options?: Record<string, unknown>
  ): SupabaseClient<Database>

  export function createBrowserSupabaseClient<Database>(
    options?: Record<string, unknown>
  ): SupabaseClient<Database>
}
