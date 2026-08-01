// Client-side helper for Stripe Checkout. Calls the authenticated server
// endpoint POST /api/stripe/create-checkout and returns the Checkout URL.

export async function createCheckoutUrl(): Promise<string> {
  const res = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not start checkout. Please try again.");
  }
  return data.url as string;
}
