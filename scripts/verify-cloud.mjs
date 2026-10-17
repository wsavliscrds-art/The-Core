import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
export async function verifyAuth(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Cloud authentication test configuration missing');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const admin=createClient(url,key,options);
 const userClient=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 const email='core-qa-'+randomUUID()+'@example.com',password=randomBytes(32).toString('base64url');
 let userId;
 const check=(result)=>{if(result.error)throw Error('Cloud verification failed: '+result.error.code);return result.data};
 try{
  userId=check(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Temporary automated QA'}})).user.id;
  check(await userClient.auth.signInWithPassword({email,password}));
  const verified=check(await userClient.auth.getUser());
  if(verified.user.id!==userId)throw Error('Session verification failed');
  const id=randomUUID();const data={id,kind:'task',title:'Temporary QA task',date:'2026-10-17',time:'09:00',priority:'Média',done:false,details:'',checks:[],checkins:[]};
  check(await userClient.from('core_items').insert({user_id:userId,id,kind:data.kind,title:data.title,data}));
  const records=check(await userClient.from('core_items').select('data').eq('id',id));
  if(records.length!==1)throw Error('Authenticated read failed');
  const updated=check(await userClient.from('core_items').update({data:{...data,done:true}}).eq('id',id).select('data'));
  if(!updated[0]?.data.done)throw Error('Authenticated update failed');
  const deleted=check(await userClient.from('core_items').delete().eq('id',id).select('id'));
  if(deleted.length!==1)throw Error('Authenticated delete failed');
  check(await userClient.auth.signOut());
  console.log('Supabase login, verified session and authenticated CRUD passed.');
 }finally{
  if(userId){const result=await admin.auth.admin.deleteUser(userId);if(result.error)throw Error('Temporary QA account cleanup failed');console.log('Temporary QA account removed.');}
 }
}
