import { Routes } from '@angular/router';
import { LoginComponent } from './presentation/features/auth/login/login.component';
import { MainLayoutComponent } from './presentation/layouts/main-layout/main-layout.component';
import { PoliticaDesignerComponent } from './presentation/features/politica-designer/politica-designer.component';
import { PoliticaListComponent } from './presentation/features/politica-list/politica-list.component';
import { InboxComponent } from './presentation/features/inbox/inbox.component';
import { TramiteAtencionComponent } from './presentation/features/tramite-atencion/tramite-atencion.component';
import { TramiteHistorialComponent } from './presentation/features/tramite-historial/tramite-historial.component';
import { SupervisionComponent } from './presentation/features/supervision/supervision.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    component: MainLayoutComponent,
    children: [
      { path: 'catalog', component: PoliticaListComponent },
      { path: 'designer', component: PoliticaDesignerComponent },
      { path: 'inbox', component: InboxComponent },
      { path: 'tramite/atencion/:id', component: TramiteAtencionComponent },
      { path: 'tramite/historial/:id', component: TramiteHistorialComponent },
      { path: 'supervision', component: SupervisionComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
