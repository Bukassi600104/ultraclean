"use client";
import {createContext,useContext} from "react";
const Identity=createContext<string|null>(null);
export function ContentIdentity({actorId,children}:{actorId:string;children:React.ReactNode}){return <Identity.Provider value={actorId}>{children}</Identity.Provider>}
export function useContentIdentity(){const id=useContext(Identity);if(!id)throw Error('Content identity is unavailable');return id}
