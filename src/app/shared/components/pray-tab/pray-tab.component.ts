import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PrayComponent } from '../../../pray/pray.component';

@Component({
  standalone: true,
  selector: 'app-pray-tab',
  imports: [CommonModule, MatButtonModule, MatIconModule, PrayComponent],
  templateUrl: './pray-tab.component.html',
  styleUrl: './pray-tab.component.css',
  animations: [
    trigger('tabSlide', [
      state('hidden', style({ transform: 'translateY(110%)', opacity: 0 })),
      state('visible', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('hidden => visible', animate('300ms 550ms cubic-bezier(0.2, 0, 0, 1)'))
    ]),
    trigger('overlaySlide', [
      state('closed', style({ transform: 'translateY(100%)' })),
      state('open', style({ transform: 'translateY(0)' })),
      // Animate when element is inserted
      transition('void => open', [
        style({ transform: 'translateY(100%)' }),
        animate('500ms cubic-bezier(0.2, 0, 0, 1)')
      ]),
      // Animate when element is removed
      transition('open => void', [
        animate('300ms cubic-bezier(0.2, 0, 0, 1)', style({ transform: 'translateY(100%)' }))
      ]),
      // State-to-state toggles
      transition('closed => open', animate('500ms cubic-bezier(0.2, 0, 0, 1)')),
      transition('open => closed', animate('300ms cubic-bezier(0.2, 0, 0, 1)')),
    ]),
    // Move the tab in concert with the overlay to feel connected
    trigger('tabLift', [
      state('atBottom', style({ transform: 'translateY(0)' })),
      state('withOverlay', style({ transform: 'translateY(-16px)' })),
      transition('atBottom => withOverlay', animate('500ms cubic-bezier(0.2, 0, 0, 1)')),
      transition('withOverlay => atBottom', animate('200ms ease-in')),
    ])
  ]
})
export class PrayTabComponent {
  @Input() listId?: number;

  tabVisible = signal(false);
  overlayOpen = signal(false);

  ngOnInit() {
    // Show the tab after the route slide likely completed
    // Matches app route animation ~500ms
    setTimeout(() => this.tabVisible.set(true), 10); // quickly schedule; CSS handles delay
  }

  openOverlay() {
    this.overlayOpen.set(true);
  }

  closeOverlay() {
    this.overlayOpen.set(false);
  }
}
