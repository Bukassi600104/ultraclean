"use client";
import {useEffect,useState} from "react";

/** Decisions may arrive from the other person's device while this page is open. */
export function useFarmRecordRefresh(){
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const refresh=()=>{if(document.visibilityState!=="visible"||!navigator.onLine)return;clearTimeout(timer);timer=setTimeout(()=>setRevision(v=>v+1),150);};
  const events=["focus","online","farm-records-synced","operations-cash-updated"];
  events.forEach(name=>window.addEventListener(name,refresh));document.addEventListener("visibilitychange",refresh);
  const interval=setInterval(refresh,60000);
  return()=>{clearInterval(interval);clearTimeout(timer);events.forEach(name=>window.removeEventListener(name,refresh));document.removeEventListener("visibilitychange",refresh);};
 },[]);
 return revision;
}
