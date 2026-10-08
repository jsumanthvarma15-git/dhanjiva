import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import appCss from '../styles.css?url';
import meta from '../app-meta.json';
import { reportHiggsfieldError } from '../lib/higgsfield-error-reporting';
declare const __HF_DESIGN_INSPECTOR__: boolean;
const origin = 'https://dhanjiva-connected.higgsfield.app';
export const Route = createRootRouteWithContext<{queryClient: QueryClient}>()({
 head:()=>({meta:[{charSet:'utf-8'},{name:'viewport',content:'width=device-width, initial-scale=1'},{title:meta.og_title},{name:'description',content:meta.og_description},{name:'author',content:'Dhanjiva'},{name:'theme-color',content:'ivory'},{name:'robots',content:'index, follow, max-image-preview:large'},{property:'og:title',content:meta.og_title},{property:'og:description',content:meta.og_description},{property:'og:site_name',content:'Dhanjiva'},{property:'og:type',content:'website'},{property:'og:url',content:origin},{property:'og:image',content:meta.og_image_url},{name:'twitter:card',content:'summary_large_image'},{name:'twitter:image',content:meta.og_image_url}],links:[{rel:'stylesheet',href:appCss},{rel:'canonical',href:origin},{rel:'icon',href:'/favicon.ico'},{rel:'icon',type:'image/png',sizes:'32x32',href:'/favicon-32.png'},{rel:'icon',type:'image/png',sizes:'16x16',href:'/favicon-16.png'},{rel:'apple-touch-icon',href:'/apple-touch-icon.png'},{rel:'manifest',href:'/site.webmanifest'},{rel:'preconnect',href:'https://fonts.googleapis.com'},{rel:'preconnect',href:'https://fonts.gstatic.com',crossOrigin:'anonymous'},{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@400;450;500;550;600;650&display=swap'}]}),
 shellComponent:({children}:{children:ReactNode})=><html lang="en" style={{colorScheme:'light'}}><head><HeadContent/></head><body>{children}<Scripts/></body></html>,
 component:Root,
 notFoundComponent:()=> <main className="error-page"><img src="/assets/dhanjiva-logo.jpg" alt="Dhanjiva"/><h1>Let’s find your way back.</h1><p>This page isn’t available.</p><a href="/">Return to Dhanjiva</a></main>,
 errorComponent:({reset})=><main className="error-page"><h1>This page needs a moment.</h1><p>Please try again.</p><button onClick={reset}>Try again</button></main>
});
function Root(){const {queryClient}=Route.useRouteContext();useEffect(()=>{if(!__HF_DESIGN_INSPECTOR__)return;void import('../module/design-inspector/runtime').then(({installHiggsfieldDesignInspector})=>installHiggsfieldDesignInspector()).catch(error=>reportHiggsfieldError(error instanceof Error?error:new Error('Inspector unavailable'),{boundary:'design_inspector'}));},[]);return <QueryClientProvider client={queryClient}><Outlet/></QueryClientProvider>}
