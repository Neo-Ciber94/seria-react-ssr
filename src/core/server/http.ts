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
      "x-route-redirect": to,
    },
  });
}

/**
 * Create a 404 not found response.
 * @param message Error message to display
 */
export function notFound(message?: string) {
  return new Response(message, {
    status: 404,
    headers: {
      "x-route-not-found": "1",
      "content-type": "text/plain",
    },
  });
}

/**
 * Create an error response.
 * @param message Error message to display
 */
export function error(message: string, status: number = 400) {
  return new Response(message, {
    status,
    headers: {
      "x-route-error": "1",
      "content-type": "text/plain",
    },
  });
}
