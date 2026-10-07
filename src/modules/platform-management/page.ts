import {redirect} from 'next/navigation';import {AccessError} from '@/platform/http';
export async function managementPage<T>(read:()=>Promise<T>){try{return await read();}catch(e){if(e instanceof AccessError)redirect(e.status===401?'/admin':'/admin/panel?denied=1');throw e;}}
