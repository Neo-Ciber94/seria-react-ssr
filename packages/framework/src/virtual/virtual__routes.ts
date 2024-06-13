export interface Layout {
    id: string;
    layoutPath: string;
    component?: (props: { children: any }) => any,
    loader?: (...args: any[]) => any | Promise<any>,
}

export interface Route {
    id: string,
    routePath: string
    component?: () => any,
    loader?: (...args: any[]) => any | Promise<any>,
    layouts?: Layout[]
}

export interface ErrorRoute {
    id: string;
    routePath: string;
    component: () => any;
}

export interface ServerAction {
    id: string;
    actionPath: string;
    functionName: string;
    action: (...args: any[]) => Promise<any>
}

export const matchRoute = (pathname: string): any => {
    throw new Error('Not implemented')
}

export const matchErrorRoute = (pathname: string): any => {
    throw new Error('Not implemented')
}

export const matchAction = (id: string): any => {
    throw new Error('Not implemented')
}