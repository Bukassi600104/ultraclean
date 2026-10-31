import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {isSupportRole} from '@/lib/manager-accounts';
import {AuthProvider} from '@/contexts/AuthContext';
import {FarmSupportWorkspace} from '@/components/manager/FarmSupportWorkspace';
export default async function Page(){const profile=await getCurrentUser();if(!profile||profile.suspended||!isSupportRole(profile.role))redirect('/login');return <AuthProvider><FarmSupportWorkspace/></AuthProvider>;}
