import { Injectable, type MessageEvent } from '@nestjs/common';
import { Observable, Subject, map } from 'rxjs';

@Injectable()
export class InboxRealtimeService {
  private readonly changes = new Subject<void>();

  publish(): void {
    this.changes.next();
  }

  stream(): Observable<MessageEvent> {
    return this.changes.pipe(map(() => ({ data: { type: 'changed' } })));
  }
}
