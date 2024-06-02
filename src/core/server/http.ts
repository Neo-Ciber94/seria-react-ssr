type RedirectStatusCode = 301 | 303 | 307 | 308;

export function redirect(to: string, status: RedirectStatusCode = 303) {
  return new Response(null, {
    status,
    headers: {
      location: to,
    },
  });
}
