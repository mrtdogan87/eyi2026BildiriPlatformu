export type AccountState={key:'CLOSED'|'ACTIVE'|'PENDING';label:string;detail:string;invitation:'NONE'|'VALID'|'EXPIRED'|'MISSING'|'INVALID';canInvite:boolean;inviteLabel:string};
export function accountState(input:{active:boolean;activationNeeded:boolean;inviteExpiresAt?:string|null;inviteUsedAt?:string|null},now?:number):AccountState;
export function organizationAccessLabel(input:{organizer:boolean;active:boolean}):string;
export function responsibleSummary(memberships:{active:boolean;account:AccountState}[]):string;
