// @vitest-environment jsdom
// Black-box acceptance for M2.1: a user of the keys page must find a second
// copy button (the gateway URL) next to the unified key, while the upstream
// "Copy base URL" (the provider URL) keeps working. Nothing here imports the
// implementation under test to inspect its state: the assertions read the DOM,
// the clipboard call and the locale files as a client would see them.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, type ComponentType, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/i18n'
import { apiFetch } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { toast } from '@/lib/toast'
import { UnifiedKeySection } from './unified-key-section'
import { ProviderList } from './provider-list'
import type { ApiKey } from '../../../../shared/types'

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/clipboard', () => ({ copyText: vi.fn() }))
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

/** ADR-004/008 strict pending marker, local to this client suite. Only an
 *  AssertionError counts as "not built yet"; a broken fixture or a runtime
 *  error still fails the run. The dev replaces `pendente(` with `it(`. */
function pendente(name: string, fn: () => unknown | Promise<unknown>) {
  it(`[pendente] ${name}`, async () => {
    let err: unknown
    try { await fn() } catch (e) { err = e }
    if (err === undefined) throw new Error(`pendente passou: tire a marca de "${name}"`)
    if ((err as Error)?.name !== 'AssertionError') throw err
  })
}

let root: Root
let container: HTMLDivElement
let client: QueryClient

beforeAll(() => {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  ;(globalThis as unknown as Record<string, unknown>).__SERVER_PORT__ = '3001'
})

beforeEach(() => {
  vi.mocked(copyText).mockReset().mockResolvedValue(true)
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
  vi.mocked(apiFetch).mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  vi.useRealTimers()
  act(() => root.unmount())
  client.clear()
  container.remove()
})

async function flush() {
  for (let i = 0; i < 6; i++) {
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  }
}

function mount(node: ReactNode) {
  act(() => root.render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="en">{node}</I18nProvider>
    </QueryClientProvider>,
  ))
  return flush()
}

async function click(el: HTMLElement) {
  await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  await flush()
}

function buttonByLabel(label: string): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
}

async function mountUnifiedKeySection() {
  vi.mocked(apiFetch).mockImplementation(async (path: string) =>
    path === '/api/settings/api-key' ? { apiKey: 'sk-freellmapi-unified' } : {})
  await mount(<UnifiedKeySection />)
  // Read the base URL the panel itself displays; the expected clipboard text
  // is derived from that, not from a hard-coded port.
  const shown = [...container.querySelectorAll('code')]
    .map(el => el.textContent?.trim() ?? '')
    .find(text => /^https?:\/\/.+\/v1\/?$/.test(text))
  expect(shown, 'base URL shown in the unified key section').toBeTruthy()
  return shown!.replace(/\/+$/, '')
}

/** The component under test does not exist before the task. A variable specifier
 *  keeps TypeScript from resolving a missing module at gate time; a missing
 *  file becomes an AssertionError, so the marker stays strict. */
async function loadCopyApiUrlButton(): Promise<ComponentType<{ baseUrl?: string | null }>> {
  const specifier = './copy-api-url-button'
  try {
    const mod = await import(/* @vite-ignore */ specifier)
    return mod.CopyApiUrlButton ?? mod.default
  } catch {
    expect(false, 'o componente copy-api-url-button ainda não existe').toBe(true)
    throw new Error('unreachable: a asserção acima sempre lança')
  }
}

async function renderButton(baseUrl?: string | null) {
  const Component = await loadCopyApiUrlButton()
  await mount(<Component baseUrl={baseUrl} />)
}

const KEY_ROW: ApiKey = {
  id: 7, platform: 'groq', label: 'QA provider row', maskedKey: 'gsk_…1234',
  baseUrl: null, apiUrl: 'https://api.groq.com/openai/v1',
  status: 'healthy', enabled: true, keyless: false, exportable: true,
  createdAt: '2026-10-01 00:00:00', lastCheckedAt: null, lastHealthError: null,
}

describe('Copy API URL button (M2.1)', () => {
  pendente('AM2.1-1 clicking Copy API URL copies <baseUrl>/chat/completions and confirms', async () => {
    const baseUrl = await mountUnifiedKeySection()
    const button = buttonByLabel('Copy API URL')
    expect(button, 'button in the unified key section').not.toBeNull()

    await click(button!)

    expect(copyText).toHaveBeenCalledTimes(1)
    expect(copyText).toHaveBeenCalledWith(`${baseUrl}/chat/completions`)
    expect(toast.success).toHaveBeenCalledWith('API URL copied')
    expect(button!.getAttribute('aria-label')).toBe('API URL copied')
  })

  pendente('AM2.1-2 without a baseUrl there is no Copy API URL button', async () => {
    await renderButton(undefined)
    expect(buttonByLabel('Copy API URL')).toBeNull()

    act(() => root.unmount())
    root = createRoot(container)
    await renderButton(null)
    expect(buttonByLabel('Copy API URL')).toBeNull()
  })

  pendente('AM2.1-3 a failed copy shows an error and never enters the copied state', async () => {
    vi.mocked(copyText).mockResolvedValueOnce(false)
    await renderButton('http://127.0.0.1:3001/v1')
    const button = buttonByLabel('Copy API URL')
    expect(button, 'button with the gateway base URL').not.toBeNull()

    await click(button!)

    expect(toast.error).toHaveBeenCalledWith("Couldn't copy — select the text and copy it manually")
    expect(toast.success).not.toHaveBeenCalled()
    expect(button!.getAttribute('aria-label')).toBe('Copy API URL')
  })

  pendente('AM2.1-4 the two new keys exist in all 60 locales with the agreed en/pt-BR text', async () => {
    const dir = resolve(process.cwd(), 'src/i18n/locales')
    const files = readdirSync(dir).filter(name => name.endsWith('.json'))
    expect(files.length).toBe(60)

    for (const name of files) {
      const data = JSON.parse(readFileSync(resolve(dir, name), 'utf8'))
      expect(typeof data.keys?.copyApiUrl, `keys.copyApiUrl in ${name}`).toBe('string')
      expect(typeof data.keys?.copiedApiUrl, `keys.copiedApiUrl in ${name}`).toBe('string')
      expect(data.keys.copyApiUrl.includes('{}'), `no placeholder in ${name}`).toBe(false)
      expect(data.keys.copiedApiUrl.includes('{}'), `no placeholder in ${name}`).toBe(false)
    }
    const en = JSON.parse(readFileSync(resolve(dir, 'en.json'), 'utf8'))
    const ptBR = JSON.parse(readFileSync(resolve(dir, 'pt-BR.json'), 'utf8'))
    expect(en.keys.copyApiUrl).toBe('Copy API URL')
    expect(en.keys.copiedApiUrl).toBe('API URL copied')
    expect(ptBR.keys.copyApiUrl).toBe('Copiar URL da API')
    expect(ptBR.keys.copiedApiUrl).toBe('URL da API copiada')
  })

  // The upstream button is a different feature (#2020). This guard already
  // passes on main and must keep passing after M2.1 lands: it copies the
  // provider URL, not the gateway URL, with setup.copyUrl keys.
  it('AM2.1-5 Copy base URL on a provider row still copies the provider URL', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/keys') return [KEY_ROW]
      if (path === '/api/health') return { platforms: [], keys: [], quotaStates: [] }
      if (path === '/api/settings/proxy') return { proxyUrl: '', enabled: false, bypassPlatforms: [], active: false }
      return {}
    })
    await mount(<ProviderList onAddKey={() => {}} />)
    const button = buttonByLabel('Copy base URL')
    expect(button, 'upstream Copy base URL button').not.toBeNull()

    await click(button!)

    expect(copyText).toHaveBeenCalledTimes(1)
    expect(copyText).toHaveBeenCalledWith('https://api.groq.com/openai/v1')
    expect(toast.success).toHaveBeenCalledWith('Base URL copied to clipboard')
  })
})
