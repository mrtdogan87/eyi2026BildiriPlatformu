export type NavigationGroup={label:string;items:readonly (readonly string[])[]};
export const congressNavigation:NavigationGroup[];
export const platformNavigation:NavigationGroup[];
export const platformPaths:Set<string>;
export function visibleNavigation(actions:readonly string[],modules:readonly string[],closed?:boolean,personalRoles?:readonly string[]):NavigationGroup[];
export function routeInfo(pathname:string):{route:string;label:string;group:string};
