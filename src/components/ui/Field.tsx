'use client'

import { useState } from 'react'

/**
 * Form controls. One look for every input, textarea and select on the site.
 *
 * There were ten variants before this, differing in padding (p-3, px-3 py-2.5,
 * px-3 py-2), border (neutral-700 or neutral-800), background (neutral-800,
 * -900 or -950), corner radius, and whether focus drew a ring. Which one you
 * got depended on which page you were on.
 *
 * Square corners rather than the rounded-sm variant: the site's cards, chips
 * and buttons are all square, and the rounded inputs were one modal's local
 * habit rather than a decision.
 */

const BASE =
  // text-base on a phone, text-sm from sm up.
  //
  // Not a size preference: iOS Safari zooms the whole page in when you focus
  // an input whose font-size is under 16px, and text-sm is 14px. Every form on
  // the site did it — tap the email box on the sign-in page and the layout
  // lurches sideways, and nothing puts it back until you pinch out again.
  // 16px is the threshold, so this is the smallest value that does not.
  'w-full bg-neutral-900 text-white text-base sm:text-sm px-3 py-2.5 ' +
  'border border-neutral-700 placeholder:text-neutral-600 ' +
  'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ' +
  'disabled:text-neutral-500 disabled:border-neutral-800 disabled:cursor-not-allowed ' +
  'transition-colors'

/**
 * Single-line controls carry a fixed height, and it is the same height as a
 * medium Button.
 *
 * Without it a field is as tall as its padding and line-height make it, which
 * is 42px, and no button size is 42px. Any form that puts a button beside an
 * input — the comment box, the profile handles — had the two disagree by ten
 * pixels, and there was no combination of the shared primitives that lined
 * them up. A field and a `size="md"` Button now match exactly.
 *
 * Deliberately not on BASE: a textarea with a fixed height is one line tall.
 */
const SINGLE_LINE = `${BASE} h-10`

/** For the few controls that need the look without the component. */
export const fieldClass = SINGLE_LINE

/** The same look for a textarea, which must grow rather than sit at one height. */
export const fieldClassMultiline = BASE

export function FieldInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${SINGLE_LINE} ${className}`.trim()} {...props} />
}

export function FieldTextarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${BASE} resize-y ${className}`.trim()} {...props} />
}

export function FieldSelect({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${SINGLE_LINE} ${className}`.trim()} {...props}>
      {children}
    </select>
  )
}

/**
 * A password box with a control that shows what has been typed.
 *
 * Every password on the site was write-only. That is the wrong default on a
 * phone, where the keyboard is small, autocorrect is close by and the field
 * gives no way to check what landed in it: the cost of a typo is a failed
 * sign-in on an existing account, and on the sign-up form it is an account
 * whose password nobody knows, discovered at the next sign-in.
 *
 * Built here rather than on one form, because a reveal on Register and not on
 * Reset is worse than none: the two would then behave differently for the same
 * job, which is the thing this codebase's shared primitives exist to stop.
 *
 * The control is a real button, so it is reachable by keyboard and announced,
 * and `aria-pressed` says which state it is in. It is deliberately outside the
 * tab order's way of the submit button only in the sense that it comes after
 * the field it belongs to, which is where somebody checking their typing
 * expects to find it. The field starts hidden every time; nothing remembers
 * that it was revealed.
 */
export function PasswordInput({
  className = '',
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="relative">
      <input
        type={revealed ? 'text' : 'password'}
        // Room for the button, so a long password does not run underneath it.
        className={`${SINGLE_LINE} pr-16 ${className}`.trim()}
        {...props}
      />
      <button
        type="button"
        onClick={() => setRevealed(v => !v)}
        aria-pressed={revealed}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        // Disabled with the field, so a form mid-submit cannot be poked at.
        disabled={props.disabled}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium uppercase tracking-wide
                   text-neutral-500 transition-colors hover:text-neutral-300
                   disabled:cursor-not-allowed disabled:text-neutral-700
                   focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px]
                   focus-visible:outline-brand"
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

/** The note under a control — a hint, or the reason it is disabled. */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-neutral-600">{children}</p>
}

/** A validation message. Same slot as FieldHint, so layout does not jump. */
export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-brand">{children}</p>
}
