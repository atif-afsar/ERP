import React from 'react';
import {DashboardModule} from '../dashboard/DashboardModule';
export const SuperAdminModule:React.FC=()=> <DashboardModule onNavigate={id=>{window.location.hash='/app/'+id}} onOpenAi={()=>{}}/>;
