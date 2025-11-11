import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAllLists } from '../store/lists/list.selectors';
import { addList } from '../store/lists/list.actions';

@Component({
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
    templateUrl: './main.component.html',
    styleUrl: './main.component.css'
})
export class MainComponent {
    private store = inject(Store);
    private dialog = inject(MatDialog);
    private router = inject(Router);

    lists = this.store.selectSignal(selectAllLists);

    async onAdd() {
        const { AddNameDialogComponent } = await import('../shared/components/add-name-dialog/add-name-dialog.component');
        const ref = this.dialog.open(AddNameDialogComponent, {
            data: { title: 'New List', label: 'List name', placeholder: 'e.g., Family' }
        });
        ref.afterClosed().subscribe(value => {
            if (value) this.store.dispatch(addList({ name: value }));
        });
    }

    openList(id: number) {
        this.router.navigate(['/list', id]);
    }
}
