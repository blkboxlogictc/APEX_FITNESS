import { getFoodByBarcode } from '@/lib/nutrition'

export const runtime = 'edge'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const food = await getFoodByBarcode(code)
  if (!food) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }
  return Response.json({ food })
}
