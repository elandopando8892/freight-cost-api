export type CustomerQuoteLifecycleStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "ARCHIVED";

export type CustomerQuoteLifecycleRole = "ADMIN" | "OPERATOR" | "VIEWER";

export function customerQuoteTransitionBlocker(input: {
  current: CustomerQuoteLifecycleStatus;
  target: CustomerQuoteLifecycleStatus;
  role: CustomerQuoteLifecycleRole;
}) {
  if (input.role === "VIEWER") return "A viewer cannot change a customer quote.";
  if (input.current === "ARCHIVED") return "An archived customer quote is immutable.";
  if (input.target === "REVIEW" && input.current === "DRAFT") return null;
  if (
    input.target === "APPROVED" &&
    input.current === "REVIEW" &&
    input.role === "ADMIN"
  )
    return null;
  if (input.target === "ARCHIVED") return null;
  if (input.target === "APPROVED" && input.role !== "ADMIN")
    return "Only an administrator can approve a customer quote.";
  return `Customer quote cannot move from ${input.current} to ${input.target}.`;
}
