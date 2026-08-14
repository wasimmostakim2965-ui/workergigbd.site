import pg from 'pg';
const ref='tsokfguhydwausvuaaiw';
const pw='Wasim@#$%_&-+()/';
const regions=['ap-southeast-1','ap-northeast-1','ap-south-1','ap-east-1','ap-southeast-2','us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1','eu-central-2','ca-central-1','sa-east-1'];
const variants = [
  {user:`postgres.${ref}`, port:6543, label:'txn postgres.ref:6543'},
  {user:`postgres.${ref}`, port:5432, label:'session postgres.ref:5432'},
  {user:`postgres`, port:6543, label:'txn postgres:6543'},
  {user:`postgres`, port:5432, label:'session postgres:5432'},
];
for(const v of variants){
  for(const r of regions){
    const url=`postgresql://${v.user}:${encodeURIComponent(pw)}@aws-0-${r}.pooler.supabase.com:${v.port}/postgres`;
    const p=new pg.Pool({connectionString:url,connectionTimeoutMillis:5000,max:1});
    try{
      const c=await p.connect();
      console.log('CONNECTED',v.label,r);
      c.release(); await p.end(); console.log('REGION_FOUND',JSON.stringify({label:v.label,region:r})); process.exit(0);
    }catch(e){
      const m=(e.message||String(e)).slice(0,90);
      if(!/not found/i.test(m) && !/ENOTFOUND/i.test(m) && !/timeout|ETIMEDOUT/i.test(m)){
        console.log('DIFFERENT',v.label,r,'=>',m);
      }
    }finally{ try{await p.end();}catch{} }
  }
}
console.log('done all, none connected');
