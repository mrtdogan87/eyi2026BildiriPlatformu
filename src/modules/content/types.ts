import type {CmsMediaView} from '@/modules/cms/configuration';
export type ContentCard={id:string;title:string;body:string;locale:'tr'|'en';organization:string;venue:string;address:string;location:string;publicEmail:string;publicPhone:string;startsAt:string;endsAt:string;images:(CmsMediaView&{alt:string;caption:string})[];people:{id:string;title:string;body:string;organization:string;role:string;talk:string;href:string|null;image:(CmsMediaView&{alt:string})|null}[];link:{href:string;label:string;external:boolean}|null};
export type DynamicView={source:string;items:ContentCard[];rows:string[][];headers:string[];note:string;preview?:boolean};
export type DynamicViews=Record<string,DynamicView>;
