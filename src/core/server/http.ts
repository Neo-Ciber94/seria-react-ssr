import {
  HEADER_ROUTE_ERROR,
  HEADER_ROUTE_NOT_FOUND,
  HEADER_ROUTE_REDIRECT,
} from "../constants";

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
      [HEADER_ROUTE_REDIRECT]: to,
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
      [HEADER_ROUTE_ERROR]: "1",
      [HEADER_ROUTE_NOT_FOUND]: "1",
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
      [HEADER_ROUTE_ERROR]: "1",
      "content-type": "text/plain",
    },
  });
}
