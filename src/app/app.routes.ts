import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./main/main.component').then(m => m.MainComponent),
        data: { depth: 0 }
    },
    {
        path: 'pray',
        loadComponent: () => import('./prayer-session/prayer-session.component').then(m => m.PrayerSessionComponent),
        data: { depth: 'none' }
    },
    {
        path: 'pray/:listId',
        loadComponent: () => import('./prayer-session/prayer-session.component').then(m => m.PrayerSessionComponent),
        data: { depth: 'none' }
    },
    {
        path: 'list/:id',
        loadComponent: () => import('./main/list/list.component').then(m => m.ListComponent),
        data: { depth: 1 }
    },
    {
        path: 'topic/:id',
        loadComponent: () => import('./main/list/topic/topic.component').then(m => m.TopicComponent),
        data: { depth: 2 }
    },
    {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
        // Use a non-numeric state so route animations don't match and no animation runs
        data: { depth: 'none' }
    },
];
