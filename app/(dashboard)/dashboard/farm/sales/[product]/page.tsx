import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/auth';
import {EGG_SALE_PRODUCT,FARM_PRODUCTS} from '@/lib/farm-products';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import SaleProductPage from '@/app/(manager)/manager/sales/[product]/page';

export default async function Page({params,searchParams}:{params:{product:string};searchParams:{period_id?:string}}){
  await requireAdmin();
  const product=[...FARM_PRODUCTS,EGG_SALE_PRODUCT].find(item=>item.key===params.product);
  if(!product)notFound();
  return <><DashboardHeader title={'Record a sale · '+product.label}/><div className="mx-auto w-full max-w-3xl p-4 lg:p-8">
    <ManagerPeriodProvider business="farm" periodId={searchParams.period_id}><SaleProductPage/></ManagerPeriodProvider>
  </div></>;
}
