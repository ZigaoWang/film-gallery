import { rateLimit, clientIp, __resetRateLimits } from '../../src/lib/rateLimit'

async function main() {
  let pass = 0, fail = 0
  const check = (name: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want)
    if (ok) pass++
    else fail++
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`)
  }

  __resetRateLimits()
  check('3-limit allows 3 then blocks', Array.from({length:4},()=>rateLimit('k',3,60000).ok), [true,true,true,false])
  const blocked = rateLimit('k', 3, 60000)
  check('retryAfter sane (1..60s)', blocked.retryAfter > 0 && blocked.retryAfter <= 60, true)

  __resetRateLimits()
  rateLimit('a:x', 1, 60000)
  check('namespaces independent', rateLimit('b:x', 1, 60000).ok, true)

  __resetRateLimits()
  rateLimit('w', 1, 50)
  check('blocked inside window', rateLimit('w', 1, 50).ok, false)
  await new Promise(r => setTimeout(r, 80))
  check('allowed after window slides', rateLimit('w', 1, 50).ok, true)

  // security-critical: IP extraction
  check('trusts X-Real-IP', clientIp(new Headers({'x-real-ip':'1.2.3.4'})), '1.2.3.4')
  check('spoofed XFF ignored when X-Real-IP present',
    clientIp(new Headers({'x-real-ip':'1.2.3.4','x-forwarded-for':'9.9.9.9, 1.2.3.4'})), '1.2.3.4')
  check('uses LAST XFF entry, not attacker-supplied first',
    clientIp(new Headers({'x-forwarded-for':'9.9.9.9, 5.6.7.8'})), '5.6.7.8')
  check('no proxy headers -> shared bucket (fails closed)', clientIp(new Headers()), 'unknown')

  // memory bound: the map is private, so eviction can only be observed as
  // forgiveness. A key already at its limit is asserted blocked first, then
  // rotation past MAX_KEYS must drop it and hand it a fresh allowance while a
  // key touched after the rotation keeps its hits. Checking a key that was
  // never near its limit passes with the eviction code deleted.
  __resetRateLimits()
  for (let i = 0; i < 5; i++) rateLimit('old', 5, 60000)
  check('exhausted key blocks before rotation', rateLimit('old', 5, 60000).ok, false)
  for (let i = 0; i < 12000; i++) rateLimit(`ip-${i}`, 5, 60000)
  for (let i = 0; i < 5; i++) rateLimit('recent', 5, 60000)
  check('IP rotation drops the oldest key hits', rateLimit('old', 5, 60000).ok, true)
  check('IP rotation keeps the newest key hits', rateLimit('recent', 5, 60000).ok, false)

  console.log(`\n  ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main()
