import { TestBed } from '@angular/core/testing';

import { ImportExport } from './import-export';

describe('ImportExport', () => {
  let service: ImportExport;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportExport);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
