export const STUB_HEADER = "x-dueline-stub";

export function stubNoContent(): Response {
  return new Response(null, { status: 204, headers: { [STUB_HEADER]: "true" } });
}
