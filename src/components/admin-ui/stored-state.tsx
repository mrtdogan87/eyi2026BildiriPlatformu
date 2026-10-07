'use client';
import {useCallback,useEffect,useRef,useState,type SetStateAction} from 'react';
import {usePathname} from 'next/navigation';
import {useAdminNavigation} from './navigation-guard';

// Store only navigation choices. Business drafts and authorization stay with their forms/server.
export function useAdminStoredState<T>(name:string,initial:T,accept?:(value:unknown)=>value is T):[T,(value:SetStateAction<T>)=>void] {
  const {scope}=useAdminNavigation(),path=usePathname(),key=scope?`admin-ui:v1:${scope}:${path}:${name}`:null;
  const [value,setValue]=useState(initial),fallback=useRef(initial),validator=useRef(accept),edited=useRef(false),current=useRef(value);
  useEffect(()=>{
    edited.current=false;
    const frame=requestAnimationFrame(()=>{
      if(edited.current)return;
      let restored=fallback.current;
      try {const raw=key?sessionStorage.getItem(key):null;if(raw){const saved:unknown=JSON.parse(raw);if(validator.current?validator.current(saved):typeof saved===typeof fallback.current)restored=saved as T;}} catch { /* Storage can be unavailable; ordinary navigation still works. */ }
      current.current=restored;setValue(restored);
    });
    return ()=>cancelAnimationFrame(frame);
  },[key]);
  const update=useCallback((next:SetStateAction<T>)=>{
    edited.current=true;
    const resolved=typeof next==='function'?(next as (previous:T)=>T)(current.current):next;
    current.current=resolved;setValue(resolved);
    try {if(key)sessionStorage.setItem(key,JSON.stringify(resolved));} catch { /* Best effort; never block editing. */ }
  },[key]);
  return [value,update];
}
