import {requireAdmin} from '@/lib/auth';
import {resolveManagerScope} from '@/lib/manager-periods';
import {DashboardHeader} from '@/components/dashboard/DashboardHeader';
import {ManagerPeriodProvider} from '@/contexts/ManagerPeriodContext';
import {FarmCredit} from '@/components/manager/FarmCredit';

export default async function Page({searchParams}: {
  searchParams: {period_id?:string; manager_id?:string; from?:string; to?:string};
}) {
  const admin = await requireAdmin();
  const {period_id, manager_id, from, to} = searchParams;
  let periodId = period_id;
  if (manager_id) {
    try {
      const selected = await resolveManagerScope(admin,'farm',{managerId: manager_id, periodId: period_id});
      if (!selected.periodId) throw new Error('Manager period unavailable');
      periodId = selected.periodId;
    } catch {
      return <><DashboardHeader title="Customers & payments"/><p className="p-4" role="alert">The selected manager’s farm records are unavailable.</p></>;
    }
  }

  return <>
    <DashboardHeader title="Customers & payments"/>
    <div className="mx-auto w-full max-w-7xl p-4 lg:p-8">
      <ManagerPeriodProvider business="farm" periodId={periodId}><FarmCredit admin from={from} to={to}/></ManagerPeriodProvider>
    </div>
  </>;
}
