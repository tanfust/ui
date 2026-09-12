import * as React from "react"

export type StepperOptions<Step extends string> = {
  /** Ordered step ids. */
  steps: ReadonlyArray<Step>
  /** Step to start on. Defaults to the first. */
  initial?: Step
  /** Steps that may be skipped with `skip()`. */
  optional?: ReadonlyArray<Step>
  /** Called when `next()` is invoked on the last step. */
  onComplete?: () => void
}

/**
 * State for multi-step flows (onboarding, checkout, wizards). Tracks the
 * current step, which steps are done or skipped, and exposes navigation that
 * never leaves the `steps` range.
 *
 * @example
 * const stepper = useStepper({ steps: ["profile", "team", "done"], optional: ["team"] })
 * stepper.current       // "profile"
 * stepper.next()        // -> "team"
 * stepper.skip()        // marks "team" skipped, -> "done"
 * stepper.progress      // 0..1
 */
export function useStepper<Step extends string>({
  steps,
  initial,
  optional = [],
  onComplete,
}: StepperOptions<Step>) {
  const [index, setIndex] = React.useState(() => Math.max(0, initial ? steps.indexOf(initial) : 0))
  const [completed, setCompleted] = React.useState<ReadonlySet<Step>>(() => new Set())
  const [skipped, setSkipped] = React.useState<ReadonlySet<Step>>(() => new Set())

  const current = steps[index]!
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  const goTo = React.useCallback(
    (step: Step) => {
      const i = steps.indexOf(step)
      if (i !== -1) setIndex(i)
    },
    [steps]
  )

  const next = React.useCallback(() => {
    setCompleted((prev) => new Set(prev).add(current))
    setSkipped((prev) => {
      if (!prev.has(current)) return prev
      const copy = new Set(prev)
      copy.delete(current)
      return copy
    })
    if (isLast) onComplete?.()
    else setIndex((i) => i + 1)
  }, [current, isLast, onComplete])

  const back = React.useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  const skip = React.useCallback(() => {
    if (!optional.includes(current)) return
    setSkipped((prev) => new Set(prev).add(current))
    if (isLast) onComplete?.()
    else setIndex((i) => i + 1)
  }, [current, isLast, onComplete, optional])

  const reset = React.useCallback(() => {
    setIndex(0)
    setCompleted(new Set())
    setSkipped(new Set())
  }, [])

  return {
    steps,
    current,
    index,
    isFirst,
    isLast,
    canSkip: optional.includes(current),
    completed,
    skipped,
    /** Fraction of steps done, 0 to 1 (current step counts as in progress). */
    progress: steps.length <= 1 ? 1 : index / (steps.length - 1),
    next,
    back,
    skip,
    goTo,
    reset,
    isCompleted: (step: Step) => completed.has(step),
    isSkipped: (step: Step) => skipped.has(step),
  }
}

export type Stepper<Step extends string> = ReturnType<typeof useStepper<Step>>
