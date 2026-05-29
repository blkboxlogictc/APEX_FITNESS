/**
 * APEX Pre-Deploy Checklist
 * Run: npx ts-node scripts/pre-deploy-checklist.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env.local for local runs
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (key && !process.env[key]) process.env[key] = val
  })
}

interface CheckResult {
  label: string
  pass: boolean
  note?: string
}

const results: CheckResult[] = []

function check(label: string, pass: boolean, note?: string) {
  results.push({ label, pass, note })
  const icon = pass ? '✅' : '❌'
  console.log(`${icon} ${label}${note ? ` — ${note}` : ''}`)
}

async function run() {
  console.log('\n🚀 APEX Pre-Deploy Checklist\n')

  // ─── Environment Variables ──────────────────────────────────────────────────
  console.log('── Environment Variables ──')
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'NEXT_PUBLIC_APP_URL',
    'CRON_SECRET',
  ]
  const optional = ['USDA_API_KEY', 'API_NINJAS_KEY']

  for (const key of required) {
    check(key, !!process.env[key], !process.env[key] ? 'MISSING — required' : undefined)
  }
  for (const key of optional) {
    check(key, !!process.env[key], !process.env[key] ? 'missing — optional' : undefined)
  }

  // ─── Icons ──────────────────────────────────────────────────────────────────
  console.log('\n── PWA Icons ──')
  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512]
  for (const size of iconSizes) {
    const p = path.join(process.cwd(), 'public', 'icons', `icon-${size}.png`)
    check(`icon-${size}.png`, fs.existsSync(p))
  }
  check('apple-touch-icon.png', fs.existsSync(path.join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png')))
  check('favicon.ico', fs.existsSync(path.join(process.cwd(), 'public', 'favicon.ico')))

  // ─── Splash Screens ─────────────────────────────────────────────────────────
  console.log('\n── Splash Screens ──')
  const splashes = ['iphone-14-pro', 'iphone-14', 'iphone-se']
  for (const name of splashes) {
    const p = path.join(process.cwd(), 'public', 'splash', `${name}.png`)
    check(`splash/${name}.png`, fs.existsSync(p))
  }

  // ─── Critical Files ─────────────────────────────────────────────────────────
  console.log('\n── Critical Files ──')
  const criticalFiles = [
    'public/manifest.json',
    'public/sw.js',
    'public/offline.html',
    'vercel.json',
    'next.config.js',
    'middleware.ts',
  ]
  for (const f of criticalFiles) {
    check(f, fs.existsSync(path.join(process.cwd(), f)))
  }

  // ─── Supabase Connection ─────────────────────────────────────────────────────
  console.log('\n── Supabase ──')
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const expectedTables = [
        'user_profiles', 'fitness_plans', 'nutrition_plans', 'workout_sessions',
        'workout_sets', 'exercise_history', 'food_logs', 'water_logs',
        'activity_logs', 'sport_programs', 'supplement_stack',
        'pain_screenings', 'prehab_programs', 'prehab_logs', 'movement_assessments',
        'body_measurements', 'weekly_recaps', 'goals', 'progress_photos',
        'push_subscriptions', 'notification_preferences',
        'chat_messages', 'plan_edit_history',
      ]

      for (const table of expectedTables) {
        const { error } = await supabase.from(table).select('id').limit(1)
        check(`Table: ${table}`, !error, error?.message)
      }
    } catch (err) {
      check('Supabase connection', false, String(err))
    }
  } else {
    check('Supabase connection', false, 'Missing credentials — skipped')
  }

  // ─── OpenAI ─────────────────────────────────────────────────────────────────
  console.log('\n── External APIs ──')
  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import('openai')
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      })
      check('OpenAI API key', true)
    } catch (err) {
      check('OpenAI API key', false, String(err))
    }
  } else {
    check('OpenAI API key', false, 'Missing')
  }

  // ─── VAPID ──────────────────────────────────────────────────────────────────
  const vapidOk = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
  check('VAPID keys configured', vapidOk)

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass).length
  const total = results.length
  const allGood = passed === total

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`${allGood ? '🎉' : '⚠️'} ${passed}/${total} checks passed`)

  if (!allGood) {
    console.log('\nFix the issues above before deploying.')
    process.exit(1)
  } else {
    console.log('\n✅ Ready to deploy!')
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
