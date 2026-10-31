'use client';
import {useState} from 'react';
export function MessageBimbo(){
 const [copyStatus,setCopyStatus]=useState('');
 return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><a href="https://wa.me/16478238262" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline">Message Bimbo on WhatsApp</a><button type="button" className="min-h-11 underline" onClick={async()=>{try{await navigator.clipboard.writeText('+16478238262');setCopyStatus('Number copied');}catch{setCopyStatus('Copy this number: +1 647 823 8262');}}}>Copy number</button>{copyStatus&&<span role="status">{copyStatus}</span>}</div>;
}
