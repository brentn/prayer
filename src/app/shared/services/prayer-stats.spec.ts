import { TestBed } from '@angular/core/testing';

import { PrayerStats } from './prayer-stats';

describe('PrayerStats', () => {
  let service: PrayerStats;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrayerStats);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
