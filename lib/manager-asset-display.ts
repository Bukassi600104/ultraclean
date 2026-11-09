import {displayRecordValue} from './record-display';

export function managerAssetLabel(resource:string,row:Record<string,unknown>):string {
 const name=row.item_name||row.name||row.title||row.other_product_name||row.product||row.feed_type||row.tenant_name||row.platform;
 const parts=[name?displayRecordValue(name):'Name not recorded'];
 if(resource==='farm_feed_stock')parts.push(row.feed_source?displayRecordValue(row.feed_source):'Source not recorded');
 for(const key of ['chicken_type','growth_stage','sex'])if(row[key])parts.push(displayRecordValue(row[key]));
 if(row.current_quantity!=null)parts.push(`${row.current_quantity}${row.unit?' '+row.unit:''}`);
 else if(row.current_stock!=null)parts.push(String(row.current_stock));
 else if(resource==='farm_feed_stock')parts.push(row.current_bags==null?'Starting count needed':`${row.current_bags} unopened bags`);
 return parts.join(' · ');
}

export function assetReviewLink(resource:string):string {
 return resource==='farm_feed_stock'?'/dashboard/farm/feed-stock':resource==='farm_supply_inventory'?'/dashboard/farm/supplies':resource==='farm_batches'||resource==='farm_sites'?'/dashboard/farm/batches':'/dashboard/farm/inventory';
}
