// Server-only demo kill-switch. Demo mode is ON unless explicitly disabled
// with DEMO_MODE=false, so provider integrations stay inert by default and
// can reach real services only through a deliberate production setting.
// Never import this from client code; the variable has no NEXT_PUBLIC_
// prefix and must never receive one.
export function isDemoMode(): boolean {
  return process.env["DEMO_MODE"] !== "false";
}
