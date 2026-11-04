/**
 * Unit tests for the button interaction rules (src/components/ui/buttonState.ts).
 *
 *   npm run test:interactions
 *
 * The rules decide when Run, Submit and the other buttons can be activated,
 * how they are announced while busy or disabled, and when the pressed style
 * shows for keyboard presses. The same states are checked in a real browser by
 * `npm run test:ui` (see scripts/test-ui.mjs).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buttonState, isActivationKey, isRepeatedEnter } from '../src/components/ui/buttonState.ts'

test('an available button can be activated and carries no busy or disabled attributes', () => {
  assert.deepEqual(buttonState({ busy: false, disabled: false, keyPressed: false }), {
    activatable: true,
    disabled: false,
    ariaBusy: false,
    ariaDisabled: false,
    pressed: false,
  })
})

test('a busy button ignores activation but stays focusable (aria-disabled, not disabled)', () => {
  const state = buttonState({ busy: true, disabled: false, keyPressed: false })
  assert.equal(state.activatable, false)
  assert.equal(state.disabled, false, 'native disabled would drop keyboard focus to the top of the page')
  assert.equal(state.ariaDisabled, true)
  assert.equal(state.ariaBusy, true)
})

test('a disabled button cannot be activated and uses native disabled', () => {
  const state = buttonState({ busy: false, disabled: true, keyPressed: false })
  assert.equal(state.activatable, false)
  assert.equal(state.disabled, true)
  assert.equal(state.ariaDisabled, false, 'native disabled already says so; aria-disabled would be redundant')
})

test('busy and disabled together: still not activatable, announced as busy', () => {
  const state = buttonState({ busy: true, disabled: true, keyPressed: false })
  assert.equal(state.activatable, false)
  assert.equal(state.disabled, true)
  assert.equal(state.ariaBusy, true)
})

test('a keyboard press shows the pressed style only on a button that can be used', () => {
  assert.equal(buttonState({ busy: false, disabled: false, keyPressed: true }).pressed, true)
  assert.equal(buttonState({ busy: true, disabled: false, keyPressed: true }).pressed, false)
  assert.equal(buttonState({ busy: false, disabled: true, keyPressed: true }).pressed, false)
})

test('Enter and Space activate buttons; other keys do not', () => {
  assert.equal(isActivationKey('Enter'), true)
  assert.equal(isActivationKey(' '), true)
  for (const key of ['Spacebar', 'Tab', 'Escape', 'a', 'ArrowDown']) assert.equal(isActivationKey(key), false, key)
})

test('a held Enter acts once: only the first key press counts, repeats are ignored', () => {
  assert.equal(isRepeatedEnter('Enter', false), false, 'the first press acts')
  assert.equal(isRepeatedEnter('Enter', true), true, 'auto-repeat while held is ignored')
  assert.equal(isRepeatedEnter(' ', true), false, 'Space only activates on release, so its repeats never click')
  assert.equal(isRepeatedEnter('a', true), false)
})
