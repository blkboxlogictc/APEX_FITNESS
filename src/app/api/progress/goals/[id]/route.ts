import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      current_value?: number
      is_achieved?: boolean
      target_date?: string
      target_value?: number
      description?: string
      is_active?: boolean
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.current_value !== undefined) update.current_value = body.current_value
    if (body.is_achieved !== undefined) {
      update.is_achieved = body.is_achieved
      if (body.is_achieved) update.achieved_at = new Date().toISOString()
    }
    if (body.target_date !== undefined) update.target_date = body.target_date
    if (body.target_value !== undefined) update.target_value = body.target_value
    if (body.description !== undefined) update.description = body.description
    if (body.is_active !== undefined) update.is_active = body.is_active

    const { data, error } = await supabase
      .from('goals')
      .update(update as any)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    console.error('goals PATCH error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('goals DELETE error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
