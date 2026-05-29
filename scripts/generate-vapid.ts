/**
 * VAPID Key Generator for Web Push
 * Run ONCE: npx ts-node scripts/generate-vapid.ts
 * Then copy the output into your .env.local
 *
 * IMPORTANT: Regenerating VAPID keys invalidates ALL existing push subscriptions.
 * Only run this once per deployment environment.
 *
 * Install: npm install -D web-push @types/web-push ts-node
 */

import webpush from 'web-push'

const vapidKeys = webpush.generateVAPIDKeys()

console.log('\n=== APEX VAPID Keys ===\n')
console.log('Add these to your .env.local:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_EMAIL=mailto:your@email.com`)
console.log('\n⚠️  SAVE THESE KEYS. Do NOT regenerate unless you want to invalidate all push subscriptions.')
