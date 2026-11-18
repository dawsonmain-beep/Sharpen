import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { buildRequest, parseReply } from './core'
import type { Turn } from './core'

const PANE = 'sharpen'
// A draft longer than this is a pasted document, not a prompt: one call on it would be slow and costly.
const MAX_DRAFT = 20_000

// Change the tag when Enhanced's fields change: a reload keeps old values.
const result = atom({ plugin: 'sharpen', key: 'result' } as const, null, {
  shape: 'result-2',
})
const isBusy = atom({ plugin: 'sharpen', key: 'isBusy' } as const, false)

// One call at a time. Module variables: set before the first await so a double press cannot start
// two calls, and dropped by a reload (session.start also clears the stored isBusy).
let running = false
let stop: AbortController | undefined

// The conversation before the draft. The draft is still in the prompt box, so the newest
// messages are what it replies to. Without them the rewriter cannot tell what "it" means.
async function conversation($: EngineInterface): Promise<Turn[]> {
  try {
    // Most rows of an agent's turn are tool calls with no text, so read well past the eight shown.
    const recent = await $.session.messages({ last: 80 })
    return Array.isArray(recent) ? recent.map(m => ({ role: m.role, text: m.text })) : []
  } catch {
    // Sharpening without the conversation still works, only less well.
    return []
  }
}

async function enhance($: EngineInterface, idea: string) {
  const original = idea.trim()
  if (!original) {
    $.ui.toast('Type a prompt first, then press Sharpen.')
    return
  }
  if (original.length > MAX_DRAFT) {
    $.ui.toast('That draft is too long to sharpen. Sharpen works on prompts, not pasted documents.')
    return
  }
  if (running) return
  running = true
  const controller = new AbortController()
  stop = controller

  try {
    await update($, isBusy, () => true)
    $.ui.status('Sharpening prompt…')
    const messages = await conversation($)
    const reply = await $.model.complete(buildRequest({ idea: original, messages }), { signal: controller.signal })
    if (!reply.isAnswered) {
      $.ui.toast(
        reply.reason === 'aborted'
          ? 'Sharpen cancelled or timed out. Your prompt is unchanged.'
          : `Sharpen failed (${reply.reason}). Your prompt is unchanged.`,
      )
      return
    }
    const parts = parseReply(reply.text)
    if (!parts) {
      $.ui.toast('Sharpen failed: the reply had no sharpened prompt. Your prompt is unchanged.')
      return
    }
    await update($, result, () => ({ original, ...parts }))
    // The author may have kept typing while the call ran. Their words win: fill only an untouched box.
    const box = (await $.prompt.read()).text.trim()
    if (box === original) {
      await $.prompt.fill({ text: parts.optimized, mode: 'replace' })
    } else {
      $.ui.toast('Your prompt changed while it was sharpening, so it was left alone. "Use sharpened" in the pane takes the rewrite.')
    }
    await $.ui.open({ id: PANE, title: 'Sharpen' })
  } catch {
    $.ui.toast('Sharpen failed. Your prompt is unchanged.')
  } finally {
    running = false
    if (stop === controller) stop = undefined
    // The stored flag first: if clearing the status line fails, the band must still come back.
    await update($, isBusy, () => false).catch(() => {})
    $.ui.status(undefined)
  }
}

// Press hooks get a 10 s budget, so the call runs on a timer, which outlives the dispatch
// that started it.
function start($: EngineInterface, idea: string) {
  $.clock.after(0, () => void enhance($, idea))
}

// The pane draws model output as Markdown. Images are removed: a remote image is fetched when
// drawn, and text the rewriter read in the conversation could make it emit one.
const safe = (text: string) => text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
const section = (title: string, body: string) => (body ? `### ${title}\n${safe(body)}\n\n` : '')

export const register: Register = on => {
  // No slash command here: the bundled skill owns /sharpen (sharpens in chat), the button sharpens the box.
  on('session.start', async ($, e, next) => {
    // A call from before a reload or a new session must not fill this session's box,
    // nor leave the band stuck on "Sharpening".
    stop?.abort()
    await update($, isBusy, () => false)
    $.ui.status(undefined)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)

    if (await read($, isBusy)) {
      return (
        <Box>
          <Text dimColor>✨ Sharpening (a few seconds)… </Text>
          <Button key="cancel" label="Cancel" onPress={() => stop?.abort()} />
        </Box>
      )
    }

    const last = await read($, result)
    return (
      <Box>
        <Button
          key="sharpen"
          label="✨ Sharpen"
          variant="primary"
          onPress={async () => start($, (await $.prompt.read()).text)}
        />
        {last && (
          <Button
            key="details"
            label="Why?"
            onPress={() => void $.ui.open({ id: PANE, title: 'Sharpen' })}
          />
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const last = await read($, result)
    if (!last) {
      return <Text dimColor>Type a prompt and press ✨ Sharpen.</Text>
    }

    // Readings first: a wrong one is the thing to catch before sending.
    const text =
      section('Check these readings of your words', last.assumptions) +
      section('Answering these would sharpen it further', last.questions) +
      section('What changed', last.breakdown) +
      (last.questions ? 'Add an answer to the box, then press Sharpen again.' : '')

    return (
      <Box flexDirection="column">
        <Markdown text={text || 'Nothing to check: the sharpened prompt is in your prompt box.'} />
        <Box>
          <Button
            key="use"
            label="Use sharpened"
            onPress={() => void $.prompt.fill({ text: last.optimized, mode: 'replace' })}
          />
          <Button
            key="restore"
            label="Restore original"
            onPress={() => void $.prompt.fill({ text: last.original, mode: 'replace' })}
          />
          <Button
            key="again"
            label="Sharpen again"
            onPress={async () => start($, (await $.prompt.read()).text)}
          />
        </Box>
      </Box>
    )
  })
}
