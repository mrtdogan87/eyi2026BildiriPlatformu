'use client';
import {Children,isValidElement,useId,useRef,useState,type ReactNode} from 'react';

export function WorkspacePanel({children}: {id:string;label:string;children:ReactNode}) {return <>{children}</>;}
export function Workspace({children,label='Çalışma alanı',initial}: {children:ReactNode;label?:string;initial?:string}) {
  const panels=Children.toArray(children).filter(isValidElement<{id:string;label:string;children:ReactNode}>);
  const [selected,setSelected]=useState(initial??panels[0]?.props.id),prefix=useId(),refs=useRef<(HTMLButtonElement|null)[]>([]);
  const active=panels.some(p=>p.props.id===selected)?selected:panels[0]?.props.id;
  return <div className="ui-workspace"><div className="ui-tabs" role="tablist" aria-label={label}>{panels.map((panel,index)=><button type="button" key={panel.props.id} ref={el=>{refs.current[index]=el;}} role="tab" id={`${prefix}-tab-${panel.props.id}`} aria-controls={`${prefix}-panel-${panel.props.id}`} aria-selected={active===panel.props.id} tabIndex={active===panel.props.id?0:-1} onClick={()=>setSelected(panel.props.id)} onKeyDown={e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%panels.length;else if(e.key==='ArrowLeft')next=(index+panels.length-1)%panels.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=panels.length-1;else return;e.preventDefault();setSelected(panels[next].props.id);refs.current[next]?.focus();}}>{panel.props.label}</button>)}</div>{panels.map(panel=><div key={panel.props.id} role="tabpanel" id={`${prefix}-panel-${panel.props.id}`} aria-labelledby={`${prefix}-tab-${panel.props.id}`} hidden={active!==panel.props.id} inert={active!==panel.props.id} tabIndex={0}>{panel.props.children}</div>)}</div>;
}
export function DetailSection({title,children,open=false}: {title:string;children:ReactNode;open?:boolean}) {return <details className="ui-detail" open={open}><summary>{title}</summary><div>{children}</div></details>;}
export function EmptyState({title,children}: {title:string;children?:ReactNode}) {return <div className="ui-empty"><strong>{title}</strong>{children&&<p>{children}</p>}</div>;}
export function StatusLabel({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'success'|'warning'|'danger'}){return <span className={`ui-status ui-status-${tone}`}>{children}</span>;}
