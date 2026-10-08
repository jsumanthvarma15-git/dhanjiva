import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {bindings} from '../bindings.server';
export const submitEnquiry=createServerFn({method:'POST'})
.validator(z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),hospital:z.string().trim().min(2).max(160),interest:z.enum(['Complete hospital','Operations','Finance','Pharmacy']),website:z.string().max(200).default(''),consent:z.literal(true)}))
.handler(async({data})=>{
 if(data.website)return {ok:false,message:'Please leave the website field blank.'};
 const {DB}=bindings();if(!DB)return {ok:false,message:'Requests are temporarily unavailable. Please try again later.'};
 const id=crypto.randomUUID(), now=Date.now();
 try{
 const result=await DB.prepare('INSERT INTO enquiries (id,name,email,hospital,interest,created_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM enquiries WHERE email=? AND created_at>?)').bind(id,data.name,data.email,data.hospital,data.interest,now,data.email,now-60000).run();
 if(!result.meta.changes)return {ok:false,message:'A request was recently saved for this email. Please wait a minute before trying again.'};
 return {ok:true,message:'Your request has been saved.',reference:id.slice(0,8).toUpperCase()};
 }catch{return {ok:false,message:'We could not save your request. Please try again.'};}
});
