export type AvatarPreference={color:string;initials:string};
export const avatarColors:readonly {id:string;label:string;value:string}[];
export function avatarInitials(name:string):string;
export function defaultAvatar(userId:string,name:string):AvatarPreference;
export function parseAvatarPreference(raw:string|null,fallback:AvatarPreference):AvatarPreference;
export function managementLayer(route:string,platformAdmin:boolean,canManageInstitutions:boolean,organizationSelected?:boolean):'PLATFORM'|'ORGANIZATION'|'CONGRESS';
