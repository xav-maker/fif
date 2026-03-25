import type { TimelineEvent } from '../models/types';

export class Timeline {
  private events: TimelineEvent[] = [];
  public currentTime = 0;

  addEvent(event: TimelineEvent): void {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
  }

  getNextEvent(): TimelineEvent | null {
    if (this.events.length === 0) return null;
    const event = this.events.shift()!;
    this.currentTime = event.time;
    return event;
  }

  peekNext(): TimelineEvent | null {
    return this.events[0] ?? null;
  }

  peekUpcoming(count: number): TimelineEvent[] {
    return this.events.slice(0, count);
  }

  removeEventsForActor(actorId: string): void {
    this.events = this.events.filter(e => e.actorId !== actorId);
  }

  removeEventById(id: string): void {
    this.events = this.events.filter(e => e.id !== id);
  }

  isEmpty(): boolean {
    return this.events.length === 0;
  }
}
