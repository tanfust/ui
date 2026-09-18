import { useStepper } from "@/registry/tanfust/hooks/use-stepper"

const steps = ["account", "workspace", "invite", "done"] as const

export default function UseStepperDemo() {
  const stepper = useStepper({ steps, optional: ["invite"] })

  return (
    <div className="flex w-full max-w-md flex-col gap-4 font-mono text-xs">
      <ol className="flex items-center gap-2 text-xs tracking-wider uppercase">
        {stepper.steps.map((step, i) => (
          <li className="flex items-center gap-2" key={step}>
            <button
              className={
                step === stepper.current
                  ? "font-bold underline underline-offset-4"
                  : stepper.isCompleted(step)
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
              onClick={() => stepper.goTo(step)}
              type="button"
            >
              {stepper.isSkipped(step) ? `(${step})` : step}
            </button>
            {i < stepper.steps.length - 1 ? <span aria-hidden>/</span> : null}
          </li>
        ))}
      </ol>

      {/* One segment per step rather than a percentage-width bar: a stepper is
          discrete, and this needs no inline style for a runtime value. */}
      <div aria-hidden className="flex h-1 w-full gap-px">
        {stepper.steps.map((step, i) => (
          <span
            className={
              i <= stepper.index ? "flex-1 bg-foreground" : "flex-1 bg-muted"
            }
            key={step}
          />
        ))}
      </div>

      <p>
        Step {stepper.index + 1} of {stepper.steps.length}:{" "}
        <strong>{stepper.current}</strong> · {Math.round(stepper.progress * 100)}%
      </p>

      <div className="flex gap-2">
        <button
          className="border border-foreground px-3 py-1 tracking-wider uppercase disabled:opacity-40"
          disabled={stepper.isFirst}
          onClick={stepper.back}
          type="button"
        >
          Back
        </button>
        {stepper.canSkip ? (
          <button
            className="border border-transparent px-3 py-1 tracking-wider uppercase underline-offset-4 hover:underline"
            onClick={stepper.skip}
            type="button"
          >
            Skip
          </button>
        ) : null}
        <button
          className="border border-foreground bg-foreground px-3 py-1 tracking-wider text-background uppercase"
          onClick={stepper.isLast ? stepper.reset : stepper.next}
          type="button"
        >
          {stepper.isLast ? "Start over" : "Next →"}
        </button>
      </div>
    </div>
  )
}
