"use client";
import {useEffect,useRef} from "react";

// Native fragment scrolling runs before farm records arrive on slow connections.
export function useFarmRecordAnchor(records:unknown) {
  const last=useRef("");
  useEffect(()=>{
    if(!records)return;
    const find=()=>{
      const id=window.location.hash.slice(1);
      if(!id||last.current===id)return;
      const row=document.getElementById(id);
      if(row){last.current=id;row.focus({preventScroll:true});row.scrollIntoView({block:"center"});}
    };
    const changed=()=>{last.current="";find();};
    find();
    window.addEventListener("hashchange",changed);
    return ()=>window.removeEventListener("hashchange",changed);
  },[records]);
}
