// The 60-second demo is also the end-to-end test: every beat asserts what it shows.
// It runs on a fresh browser context at 1440×900 and records its own video; scripts/demo-video.mjs
// turns the recording into public/pulse-demo.mp4. If a step needs a manual fix, the demo is not done.
import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } }, viewport: { width: 1440, height: 900 } });

/** A visible cursor for the recording (headless video has none). */
async function addCursor(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const c = document.createElement('div');
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid #1378d1;pointer-events:none;left:-40px;top:-40px;transition:transform .08s';
      document.body.appendChild(c);
      document.addEventListener('mousemove', (e) => { c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px`; }, true);
      document.addEventListener('mousedown', () => (c.style.transform = 'scale(.7)'), true);
      document.addEventListener('mouseup', () => (c.style.transform = 'scale(1)'), true);
    });
  });
}

const beat = (page: Page, ms: number) => page.waitForTimeout(ms);

/** Move the cursor visibly to an element, then click it. */
async function tap(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await beat(page, 120);
  await target.click();
}

async function type(page: Page, target: Locator, text: string) {
  await tap(page, target);
  await target.fill('');
  await target.pressSequentially(text, { delay: 55 });
}

test('60-second demo: one check-in, two answers', async ({ page }, info) => {
  await addCursor(page);
  const t0 = Date.now();

  // 0–8 s · Landing → founder → the Seed-stage climate company. Values are pre-filled.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pulse', level: 1 })).toBeVisible();
  await expect(page.getByText('Concept prototype · invented data')).toBeVisible();
  await beat(page, 4000);
  await expect(page.getByLabel('Your company')).toHaveValue('hearthline');
  await tap(page, page.getByRole('button', { name: 'Start check-in' }));
  await expect(page.getByRole('heading', { name: 'Hearthline: 2026-Q3 check-in' })).toBeVisible();
  await expect(page.getByText('Demo: nothing you enter leaves your browser.')).toBeVisible();
  const installs = page.getByRole('region', { name: 'Heat pumps installed' });
  const co2 = page.getByRole('region', { name: 'Tonnes CO2e avoided' });
  await expect(installs.getByRole('textbox')).toHaveValue('640');
  await expect(installs.getByText('At risk')).toBeVisible();
  await beat(page, 3500);

  // 8–22 s · Update one KPI (at risk → on track); a jump on the second needs an evidence note.
  await type(page, installs.getByRole('textbox'), '700');
  await expect(installs.getByText('On track')).toBeVisible();
  await beat(page, 1200);
  await type(page, co2.getByRole('textbox', { name: /value/ }), '1900');
  await expect(co2.getByText(/65% above 2026-Q2 \(1,150\)/)).toBeVisible();
  await beat(page, 1800);
  await type(page, co2.getByRole('textbox', { name: /Note or evidence/ }), 'First metered data replaces the modelled estimate.');
  await tap(page, page.getByRole('button', { name: 'Continue' }));
  await expect(page.getByRole('heading', { name: 'What would help most this quarter?' })).toBeVisible();
  await tap(page, page.getByRole('button', { name: 'Hiring & talent' }));
  await type(page, page.getByPlaceholder('e.g. Hiring our first US sales lead'), 'Hiring our first US sales lead');
  await tap(page, page.getByRole('button', { name: 'This quarter' }));
  await tap(page, page.getByRole('button', { name: 'Continue', exact: true }));
  await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible();
  await beat(page, 2000);
  await tap(page, page.getByRole('button', { name: 'Submit check-in' }));
  await expect(page.getByTestId('checkin-summary')).toHaveText(/ · 3 of 3 fields pre-filled · 2 updated$/);
  await expect(page.getByText('20 annual fields are not due until your Q4 check-in')).toBeVisible();
  await beat(page, 3200);

  // 22–35 s · Impact review: the jump shows its flag and note; the history shows the change; accept.
  await tap(page, page.getByRole('link', { name: 'Impact review' }));
  const row = page.getByTestId('queue-hearthline_co2');
  await expect(row.getByText('Jump +65%')).toBeVisible();
  await expect(row.getByText('First metered data replaces the modelled estimate.')).toBeVisible();
  await beat(page, 2500);
  await tap(page, row.getByRole('button', { name: /^History/ }));
  const history = page.getByRole('dialog');
  await expect(history.getByText(/Value submitted · 1,150 → 1,900/)).toBeVisible();
  await beat(page, 3000);
  await page.keyboard.press('Escape');
  await tap(page, row.getByRole('button', { name: /^Accept/ }));
  await expect(row).toHaveCount(0);
  await beat(page, 1500);

  // 35–50 s · Platform inbox: the new request on top, matches with reasons, a Series A peer,
  // the intro draft, and the peer dinner card with 4 founders and a host.
  await tap(page, page.getByRole('link', { name: 'Platform inbox' }));
  const dinner = page.getByTestId('peer-dinner');
  await expect(dinner.getByText('4 founders asked about hiring in 2026-Q3.')).toBeVisible();
  await expect(dinner.getByRole('listitem')).toHaveCount(4 + 4); // invite list + host reason chips
  await beat(page, 3200);
  const first = page.locator('tbody tr').first();
  await expect(first).toContainText('Hearthline');
  await expect(first).toContainText('Hiring our first US sales lead');
  await tap(page, first.getByRole('button', { name: 'Open request from Hearthline' }));
  const drawer = page.getByRole('dialog');
  const top = drawer.getByTestId('helper-0');
  await expect(top).toContainText('Ingrid Holm');
  await expect(top.getByText('Rated 5/5 on a hiring intro in 2026-Q2')).toBeVisible();
  await expect(drawer.getByTestId('peer').first()).toContainText('Tessel Grid');
  await expect(drawer.getByTestId('peer').first().getByText('Series A, one stage ahead')).toBeVisible();
  await beat(page, 3000);
  await tap(page, top.getByRole('button', { name: 'Draft intro' }));
  await expect(drawer.getByText('Step 1 ·')).toBeVisible();
  await drawer.getByText('Step 2 ·').scrollIntoViewIfNeeded();
  await beat(page, 3500);
  await page.keyboard.press('Escape');

  // 50–58 s · Impact tiles and the portfolio aggregate; Export CSV.
  await tap(page, page.getByRole('link', { name: 'Impact review' }));
  await expect(page.getByText('12 of 12')).toBeVisible();
  await expect(page.getByText('Impact achieved vs 2025 targets')).toBeVisible();
  await expect(page.getByText('108%')).toBeVisible(); // Fund II; funds are not pooled
  await beat(page, 2800);
  const downloading = page.waitForEvent('download');
  await tap(page, page.getByRole('button', { name: 'Export CSV' }));
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('pulse-export-2026-Q3.csv');
  const csvPath = info.outputPath('pulse-export-2026-Q3.csv');
  await download.saveAs(csvPath);
  const csv = (await import('node:fs')).readFileSync(csvPath, 'utf8');
  expect(csv.split('\n')[0]).toBe(
    'company,fund,invested_capital_eur,metric,kpi_type,kpi_weight,definition,value,unit,period,direction,target_for_year,long_term_target,long_term_target_year,estimate,evidence_note,review_status,submitted_at,reviewed_at,pai_indicator',
  );
  expect(csv).toContain('Hearthline,Fund II,2000000,Tonnes CO2e avoided,attributable_impact,');
  expect(csv).toContain('"Table 1, #13"');
  await beat(page, 2000);

  // 58–60 s · End card.
  await page.goto('/#/end');
  await expect(page.getByRole('heading', { name: 'One check-in, two answers.' })).toBeVisible();
  await expect(page.getByText('A concept by Dennis Schülting.')).toBeVisible();
  await beat(page, 3500);

  const seconds = (Date.now() - t0) / 1000;
  console.log(`demo length ≈ ${seconds.toFixed(1)} s`);
  expect(seconds).toBeLessThan(75);
});
