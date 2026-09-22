import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewWatcheeForm } from './new-watchee-form';

export default async function NewWatcheePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <NewWatcheeForm />;
}
