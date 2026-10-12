import test from 'node:test';
import assert from 'node:assert/strict';
import {changesAdminPage,guardHistoryNavigation} from '../src/components/admin-ui/history-navigation.ts';

test('history route comparison protects path/query changes but keeps fragment scrolling free',()=>{
 const from='https://congress.example/admin/ekip';
 assert.equal(changesAdminPage(from,from+'#member'),false);
 assert.equal(changesAdminPage(from,'/admin/panel'),true);
 assert.equal(changesAdminPage(from,'?kurum=a'),true);
 assert.equal(changesAdminPage(from,'https://other.example/admin/panel'),false);
});

test('precommit cancellation retains the same entry and does not touch history state',async()=>{
 const navigation=new EventTarget();navigation.currentEntry={key:'edit',url:'https://congress.example/admin/ekip'};
 const win=new EventTarget();win.navigation=navigation;win.NavigationPrecommitController={};
 let answer,interception,traversals=0;navigation.traverseTo=()=>{traversals++;throw Error('unexpected traversal');};
 const remove=guardHistoryNavigation(win,()=>true,()=>new Promise(resolve=>{answer=resolve;}));
 const event=Object.assign(new Event('navigate',{cancelable:true}),{navigationType:'traverse',canIntercept:true,destination:{key:'home',url:'https://congress.example/admin/panel',sameDocument:true},signal:new AbortController().signal,intercept:options=>{interception=options;}});
 navigation.dispatchEvent(event);const pending=interception.precommitHandler();answer(false);
 await assert.rejects(pending,{name:'AbortError'});assert.equal(traversals,0);assert.equal(navigation.currentEntry.key,'edit');remove();
});

test('precommit approval leaves native App Router traversal in control',async()=>{
 const navigation=new EventTarget();navigation.currentEntry={key:'edit',url:'https://congress.example/admin/ekip'};
 const win=new EventTarget();win.navigation=navigation;win.NavigationPrecommitController={};
 let interception;const remove=guardHistoryNavigation(win,()=>true,async()=>true);
 navigation.dispatchEvent(Object.assign(new Event('navigate',{cancelable:true}),{navigationType:'traverse',canIntercept:true,destination:{key:'home',url:'https://congress.example/admin/panel',sameDocument:true},signal:new AbortController().signal,intercept:options=>{interception=options;}}));
 await interception.precommitHandler();assert.equal(interception.focusReset,'manual');assert.equal(interception.scroll,undefined);remove();
});

test('a second traversal during fallback restoration resumes the original entry before asking',async()=>{
 const origin={key:'edit',url:'https://congress.example/admin/ekip'},home={key:'home',url:'https://congress.example/admin/panel'},older={key:'older',url:'https://congress.example/admin/kongreler'};
 const navigation=new EventTarget();navigation.currentEntry=origin;navigation.entries=()=>[older,home,origin];
 const win=new EventTarget();win.navigation=navigation;
 const attempts=[];let prompts=0;
 navigation.traverseTo=key=>{let resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});attempts.push({key,resolve,reject});return {committed:finished,finished};};
 const remove=guardHistoryNavigation(win,()=>true,async()=>{prompts++;return false;});
 function back(destination){navigation.dispatchEvent(Object.assign(new Event('navigate'),{navigationType:'traverse',canIntercept:true,destination:{...destination,sameDocument:true},signal:new AbortController().signal}));navigation.currentEntry=destination;win.dispatchEvent(new Event('popstate'));}
 back(home);back(older);assert.equal(attempts.length,1);assert.equal(prompts,0);
 attempts[0].reject(new DOMException('Superseded','AbortError'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(attempts.length,2);assert.equal(attempts[1].key,'edit');assert.equal(prompts,0);
 navigation.currentEntry=origin;win.dispatchEvent(new Event('popstate'));attempts[1].resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(prompts,1);assert.equal(navigation.currentEntry.key,'edit');remove();
});
