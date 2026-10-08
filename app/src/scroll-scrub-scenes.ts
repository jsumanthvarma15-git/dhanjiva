import { createElement } from 'react';
import type { ScrollScrubScene, ScrollScrubTheme } from '@/components/scroll-scrub/scroll-scrub';
export const scrollScrubTheme: ScrollScrubTheme = {accent:'#203B4B',background:'#F7F8F3',ink:'#203B4B',muted:'#203B4B'};
const chapter=(id:string,label:string,title:string,body:string,n:number):ScrollScrubScene=>({id,label,title,body,clip:`/assets/world/department-${n}.mp4?v=hd4`,poster:`/assets/world/department-${n}-poster.jpg?v=hd4`,mobileClip:`/assets/world/department-${n}-mobile.mp4?v=hd4`,mobilePoster:`/assets/world/department-${n}-mobile-poster.jpg?v=hd4`,scroll:[2.3,2.3,1.6,1.1][n-1],linger:0,objectPosition:'50% 50%',mobileObjectPosition:'60% 50%',actions:n===4?createElement('a',{href:'#tools',className:'hero-explore'},'Explore Dhanjiva',createElement('span',{'aria-hidden':true},'↗')):undefined});
export const scrollScrubScenes: ScrollScrubScene[] = [
 chapter('overview','Outpatient','Every arrival. In order.','Coordinate outpatient counters, registration and queues in one place.',1),
 chapter('finance','Finance','Every number. In view.','Understand revenue, expenses, collections and your hospital’s profit or loss.',2),
 chapter('pharmacy','Pharmacy','Every item. Accounted for.','Connect pharmacy stock, purchasing and sales with costs and margins.',3),
 chapter('wards','Beds & wards','Every department. Connected.','Coordinate beds, admissions and teams with the same Dhanjiva tool.',4)
];
