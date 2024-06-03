type RedirectStatusCode = 301 | 303 | 307 | 308;

/**
 * Create a redirection response.
 * @param to The route to redirect to.
 * @param status The redirection status code.
 */
export function redirect(to: string, status: RedirectStatusCode = 303) {
  return new Response(null, {
    status,
    headers: {
      location: to,
      "X-Route-Redirect": to,
    },
  });
}

/**
 * Create a 404 not found response.
 */
export function notFound() {
  return new Response(null, {
    status: 404,
    headers: {
      "X-Route-Not-Found": "1",
    },
  });
}
