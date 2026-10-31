'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ClipboardList,Receipt,ShoppingBag,Package,HeartPulse,Menu} from 'lucide-react';
export function FarmMobileNav({onMore}:{onMore:()=>void}){
 const path=usePathname().replace(/^\/manager/,'')||'/',items=[{path:'/today',label:'Today',icon:ClipboardList},{path:'/expenses',label:'Expenses',icon:Receipt},{path:'/sales',label:'Sales',icon:ShoppingBag},{path:'/stores',label:'Stock',icon:Package},{path:'/health',label:'Health',icon:HeartPulse}];
 return <nav aria-label="Farm daily actions" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-emerald-900/15 bg-white pb-[env(safe-area-inset-bottom)] shadow-sm lg:hidden print:hidden">{items.map(item=>{const active=path===item.path||path.startsWith(item.path+'/'),Icon=item.icon;return <Link key={item.path} href={'/manager'+item.path} aria-current={active?'page':undefined} className={'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold '+(active?'bg-emerald-50 text-emerald-900':'text-slate-700')}><Icon aria-hidden="true" className="h-5 w-5"/>{item.label}</Link>;})}<button className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-700" onClick={onMore}><Menu aria-hidden="true" className="h-5 w-5"/>More</button></nav>;
}
