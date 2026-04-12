import { Routes } from '@angular/router';
import { PoliticaDesignerComponent } from './presentation/features/politica-designer/politica-designer.component';
import { PoliticaListComponent } from './presentation/features/politica-list/politica-list.component';
import { InboxComponent } from './presentation/features/inbox/inbox.component';
import { TramiteAtencionComponent } from './presentation/features/tramite-atencion/tramite-atencion.component';
import { TramiteHistorialComponent } from './presentation/features/tramite-historial/tramite-historial.component';
import { SupervisionComponent } from './presentation/features/supervision/supervision.component';

export const routes: Routes = [
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
  { path: 'designer', component: PoliticaDesignerComponent },
  { path: 'catalog', component: PoliticaListComponent },
  { path: 'inbox', component: InboxComponent },
  { path: 'tramite/atencion/:id', component: TramiteAtencionComponent },
  { path: 'tramite/historial/:id', component: TramiteHistorialComponent },
  { path: 'supervision', component: SupervisionComponent }
];
