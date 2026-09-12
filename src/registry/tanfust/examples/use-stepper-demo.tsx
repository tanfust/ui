import { useStepper } from "@/registry/tanfust/hooks/use-stepper"

const steps = ["account", "workspace", "invite", "done"] as const

export default function UseStepperDemo() {
  const stepper = useStepper({ steps, optional: ["invite"] })

  return (
    <div className="flex w-full max-w-md flex-col gap-4 font-mono text-xs">
      <ol className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
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

      <div aria-hidden className="h-1 w-full bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: `${stepper.progress * 100}%` }} />
      </div>

      <p>
        Step {stepper.index + 1} of {stepper.steps.length}: <strong>{stepper.current}</strong>
      </p>

      <div className="flex gap-2">
        <button
          className="border border-foreground px-3 py-1 uppercase tracking-wider disabled:opacity-40"
          disabled={stepper.isFirst}
          onClick={stepper.back}
          type="button"
        >
          Back
        </button>
        {stepper.canSkip ? (
          <button className="border border-transparent px-3 py-1 uppercase tracking-wider underline-offset-4 hover:underline" onClick={stepper.skip} type="button">
            Skip
          </button>
        ) : null}
        <button
          className="border border-foreground bg-foreground px-3 py-1 uppercase tracking-wider text-background"
          onClick={stepper.isLast ? stepper.reset : stepper.next}
          type="button"
        >
          {stepper.isLast ? "Start over" : "Next →"}
        </button>
      </div>
    </div>
  )
}
