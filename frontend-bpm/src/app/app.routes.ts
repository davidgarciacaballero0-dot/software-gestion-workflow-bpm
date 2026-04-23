import { Routes } from '@angular/router';
import { LoginComponent } from './presentation/features/auth/login/login.component';
import { RegisterComponent } from './presentation/features/auth/register/register.component';
import { MainLayoutComponent } from './presentation/layouts/main-layout/main-layout.component';
import { PoliticaListComponent } from './presentation/features/politica-list/politica-list.component';
import { PoliticaDesignerComponent } from './presentation/features/politica-designer/politica-designer.component';
import { InboxComponent } from './presentation/features/inbox/inbox.component';
import { TramiteAtencionComponent } from './presentation/features/tramite-atencion/tramite-atencion.component';
import { TramiteHistorialComponent } from './presentation/features/tramite-historial/tramite-historial.component';
import { SupervisionComponent } from './presentation/features/supervision/supervision.component';
import { OrganizacionListComponent } from './presentation/features/organizacion/organizacion-list/organizacion-list.component';
import { DepartamentoViewComponent } from './presentation/features/departamento/departamento-view/departamento-view.component';
import { UsuarioListComponent } from './presentation/features/usuario/usuario-list/usuario-list.component';
import { RolViewComponent } from './presentation/features/rol/rol-view/rol-view.component';
import { AuditoriaListComponent } from './presentation/features/auditoria/auditoria-list/auditoria-list.component';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'app', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [loginGuard] },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'catalog', pathMatch: 'full' },
      { path: 'catalog', component: PoliticaListComponent },
      { path: 'politica/designer/:id', component: PoliticaDesignerComponent },
      { path: 'inbox', component: InboxComponent },
      { path: 'tramite/atencion/:id', component: TramiteAtencionComponent },
      { path: 'tramite/historial/:id', component: TramiteHistorialComponent },
      { path: 'supervision', component: SupervisionComponent },
      { path: 'organizations', component: OrganizacionListComponent },
      { path: 'departments', component: DepartamentoViewComponent },
      { path: 'users', component: UsuarioListComponent },
      { path: 'roles', component: RolViewComponent },
      { path: 'audit', component: AuditoriaListComponent },
      { path: 'insights', loadComponent: () => import('./presentation/features/insights-ia/insights-ia.component').then(m => m.InsightsIAComponent) }
    ]
  },
  { path: '**', redirectTo: 'app' }
];
