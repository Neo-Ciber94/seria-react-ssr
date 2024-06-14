import { createRouter as createBaseRouter, RadixRouter } from "radix3";

/**
 * Route params.
 */
export type Params = Record<string, string | string[] | undefined>;

/**
 * A route in the app.
 */
export interface Route {
  /**
   * An unique identifier to find this route in the router.
   */
  id: string;

  /**
   * The path of this route in the route directory.
   */
  path: string;

  /**
   * All the layouts to apply to this route, all layout components should accept a children.
   * Layouts are applied in order.
   */
  layouts?: Layout[];

  /**
   * The component of this route.
   */
  component: () => any;

  /**
   * A function that loads data for this route.
   */
  loader?: (...args: any[]) => any;
}

/**
 * A route layout.
 */
export interface Layout {
  /**
   * An unique identifier to find this layout.
   */
  id: string;

  /**
   * The path of this layout in the route directory.
   */
  path: string;

  /**
   * The component of this route.
   */
  component: (props: { children: any }) => any;

  /**
   * A function that loads data for this layout.
   */
  loader?: (...args: any[]) => any;
}

/**
 * An error catcher for a route.
 */
export interface ErrorCatcher {
  /**
   * An unique identifier to find this error catcher.
   */
  id: string;

  /**
   *
   * The path of this error catcher.
   */
  path: string;

  /**
   * The component of this route.
   */
  component: () => any;
}

export type ServerAction = {
  /**
   * An unique identifier to find server action.
   */
  id: string;

  /**
   * The file where this server action is exported.
   */
  path: string;

  /**
   * The server action function.
   */
  action: (...args: any[]) => Promise<any>;
};

type WithPath = { path: string };

class Router<T extends WithPath> {
  #router: RadixRouter<T>;
  #entries: T[];

  constructor(entries: T[]) {
    this.#entries = entries;
    this.#router = createBaseRouter({
      routes: entries.reduce((acc, r) => ({ ...acc, [r.path]: r }), {} as Record<string, T>),
    });
  }

  get entries() {
    return this.#entries;
  }

  match(id: string) {
    return this.#router.lookup(id);
  }
}

export function createRouter(routes: Route[]) {
  return new Router(routes);
}

export function createErrorRouter(catchers: ErrorCatcher[]) {
  return new Router(catchers);
}

export function createServerActionRouter(actions: ServerAction[]) {
  return new Router(actions);
}
