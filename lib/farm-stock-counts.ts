import {z} from 'zod';
import {cashDate} from './operations-cash-validation';
const quantity=z.number().finite().min(0).max(100000000),reason=z.string().trim().min(1).max(2000);
const envelope={request_id:z.string().uuid()};
export const storeSchema=z.discriminatedUnion('operation',[
 z.object({...envelope,operation:z.literal('count'),payload:z.object({date:cashDate,resource:z.enum(['feed','supply','eggs']),stock_id:z.string().uuid(),quantity,unit:z.string().min(1).max(40),open_kg:quantity.optional(),notes:z.string().max(2000).optional(),evidence_ids:z.array(z.string().uuid()).max(6).optional()}).strict()}),
 z.object({...envelope,operation:z.literal('decide_count'),id:z.string().uuid(),payload:z.object({decision:z.enum(['approve','decline']),reason}).strict()}),
 z.object({...envelope,operation:z.literal('egg_loss'),payload:z.object({date:cashDate,batch_id:z.string().uuid(),quantity:z.number().int().min(1).max(100000000),reason,evidence_ids:z.array(z.string().uuid()).max(6).optional()}).strict()}),
 z.object({...envelope,operation:z.literal('egg_return'),payload:z.object({date:cashDate,batch_id:z.string().uuid(),sale_id:z.string().uuid(),quantity:z.number().int().min(1).max(100000000),reason,evidence_ids:z.array(z.string().uuid()).max(6).optional()}).strict()}),
 z.object({...envelope,operation:z.literal('correct_egg'),id:z.string().uuid(),payload:z.object({date:cashDate,quantity:z.number().int().min(0).max(100000000),reason}).strict()}),
 z.object({...envelope,operation:z.literal('settings'),payload:z.object({date:cashDate,resource:z.enum(['feed','eggs']),stock_id:z.string().uuid(),kg_per_bag:z.number().finite().positive().max(1000).optional(),egg_pack_size:z.number().int().positive().max(10000).optional(),reason}).strict()}),
]);
export type StoreAsset={id:string;resource:'feed'|'supply'|'eggs';label:string;quantity:number|null;unit:string;revision?:number;opening_verified?:boolean;pack_size?:number|null;unit_cost_estimate?:string|null;coverage?:{days_left:string|null;usable_kg:string|null;window_from:string;window_to:string;recorded_days:number|null;reason:string|null;basis:string}};
export type StockCount={id:string;date:string;created_at:string;resource:string;asset_id:string;quantity:number;unit:string;open_kg:number|null;system_quantity:number|null;label:string;actor_name:string|null;notes:string|null;estimated_loss_cost:string|null;decision:{decision:string;reason:string;created_at:string}|null};
export type StoreData={assets:StoreAsset[];counts:StockCount[];egg_movements:{id:string;batch_id:string;date:string;quantity:number;kind:string;reason:string|null;created_at:string;actor_name:string|null;reversed:boolean}[];egg_sales:{id:string;batch_id:string;date:string;customer:string|null;quantity:number;returned:number}[];cost_basis:string};
