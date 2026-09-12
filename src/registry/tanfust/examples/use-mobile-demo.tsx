import { useIsMobile } from "@/registry/tanfust/hooks/use-mobile"

export default function UseMobileDemo() {
  const isMobile = useIsMobile()
  return (
    <p className="font-mono text-xs">
      Viewport is <strong>{isMobile ? "mobile" : "desktop"}</strong>
      <span className="text-muted-foreground"> — resize the window to see it flip at 768px.</span>
    </p>
  )
}
