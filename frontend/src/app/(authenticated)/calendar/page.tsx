'use client';

import { useState, useMemo } from 'react';
import { useCalendarEvents, useCreateEvent, useDeleteEvent, useRsvp } from '@/hooks/use-calendar';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import type { CalendarEvent, EventInvite, RsvpStatus } from '@/types';

type ViewMode = 'month' | 'week' | 'day';

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const days: Date[] = [];
  for (let i = -startDay; i <= last.getDate() - 1 + (6 - last.getDay()); i++) {
    days.push(new Date(year, month, i + 1));
  }
  return days;
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(start.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Calendar page with month, week, and day views.
 */
export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { event_invites: EventInvite[] }) | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const rangeStart = useMemo(() => {
    if (view === 'month') return new Date(year, month, 1).toISOString();
    if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString();
    }
    return new Date(year, month, currentDate.getDate()).toISOString();
  }, [view, year, month, currentDate]);

  const rangeEnd = useMemo(() => {
    if (view === 'month') return new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - d.getDay() + 6);
      d.setHours(23, 59, 59);
      return d.toISOString();
    }
    return new Date(year, month, currentDate.getDate(), 23, 59, 59).toISOString();
  }, [view, year, month, currentDate]);

  const { data: events = [], isLoading } = useCalendarEvents(rangeStart, rangeEnd);

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {};
    for (const evt of events) {
      const dateKey = formatDate(new Date(evt.start_at));
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(evt);
    }
    return map;
  }, [events]);

  function navigate(delta: number) {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + delta);
    else if (view === 'week') d.setDate(d.getDate() + 7 * delta);
    else d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  }

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
          New Event
        </button>
      </div>

      {/* View selector and navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-sm capitalize ${v === view ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous">&larr;</button>
          <span className="text-sm font-medium">
            {view === 'month' && `${MONTH_NAMES[month]} ${year}`}
            {view === 'week' && `Week of ${formatDate(getWeekDays(currentDate)[0])}`}
            {view === 'day' && formatDate(currentDate)}
          </span>
          <button type="button" onClick={() => navigate(1)} className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next">&rarr;</button>
          <button type="button" onClick={() => setCurrentDate(new Date())} className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">Today</button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading events...</p>}

      {/* Month view */}
      {view === 'month' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800">
            {DAY_NAMES.map((d) => (
              <div key={d} className="border-b border-slate-200 p-2 text-center text-xs font-medium text-slate-500 dark:border-slate-700">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getMonthDays(year, month).map((day) => {
              const key = formatDate(day);
              const dayEvents = eventsByDate[key] ?? [];
              const isCurrentMonth = day.getMonth() === month;
              const isToday = key === formatDate(new Date());
              return (
                <div
                  key={key}
                  className={`min-h-[80px] border-b border-r border-slate-200 p-1 dark:border-slate-700 ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}
                  onClick={() => { setCurrentDate(day); setView('day'); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentDate(day); setView('day'); } }}
                >
                  <div className={`mb-1 text-xs ${isToday ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white' : isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </div>
                  {dayEvents.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className="mb-0.5 truncate rounded px-1 text-[10px] text-white"
                      style={{ backgroundColor: evt.color ?? '#3b82f6' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedEvent(evt); } }}
                    >
                      {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-[10px] text-slate-400">+{dayEvents.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-7">
            {getWeekDays(currentDate).map((day) => {
              const key = formatDate(day);
              const dayEvents = eventsByDate[key] ?? [];
              const isToday = key === formatDate(new Date());
              return (
                <div key={key} className="border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                  <div className={`border-b border-slate-200 p-2 text-center dark:border-slate-700 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <div className="text-xs text-slate-500">{DAY_NAMES[day.getDay()]}</div>
                    <div className={`text-lg font-medium ${isToday ? 'text-blue-600' : ''}`}>{day.getDate()}</div>
                  </div>
                  <div className="min-h-[300px] p-1">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="mb-1 rounded p-1 text-xs text-white"
                        style={{ backgroundColor: evt.color ?? '#3b82f6' }}
                        onClick={() => setSelectedEvent(evt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedEvent(evt); }}
                      >
                        <div className="font-medium">{evt.title}</div>
                        {!evt.all_day && <div className="opacity-80">{formatTime(evt.start_at)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day view */}
      {view === 'day' && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h2 className="mb-4 text-lg font-medium">
            {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          {(eventsByDate[formatDate(currentDate)] ?? []).length === 0 && (
            <p className="text-sm text-slate-500">No events scheduled for this day.</p>
          )}
          {(eventsByDate[formatDate(currentDate)] ?? []).map((evt) => (
            <div
              key={evt.id}
              className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              onClick={() => setSelectedEvent(evt)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedEvent(evt); }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium" style={{ color: evt.color ?? undefined }}>{evt.title}</div>
                  {evt.description && <p className="mt-1 text-sm text-slate-500">{evt.description}</p>}
                  {evt.location && <p className="mt-1 text-xs text-slate-400">Location: {evt.location}</p>}
                </div>
                <div className="text-right text-sm text-slate-500">
                  {evt.all_day ? 'All day' : `${formatTime(evt.start_at)}${evt.end_at ? ` - ${formatTime(evt.end_at)}` : ''}`}
                </div>
              </div>
              {evt.event_invites?.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {evt.event_invites.map((inv) => (
                    <span key={inv.id} className={`rounded-full px-2 py-0.5 text-xs ${inv.status === 'accepted' ? 'bg-green-100 text-green-700' : inv.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                      {inv.user?.display_name ?? 'User'}: {inv.status}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create event modal */}
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}

      {/* Event detail modal */}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const createEvent = useCreateEvent();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#3b82f6');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !title || !startAt) return;
    await createEvent.mutateAsync({
      family_id: familyId,
      title,
      description: description || null,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      all_day: allDay,
      location: location || null,
      color,
      created_by: userId,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-label="Create event">
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <h2 className="mb-4 text-lg font-bold">New Event</h2>
        <div className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="input w-full" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="input w-full" rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day event
          </label>
          <input type={allDay ? 'date' : 'datetime-local'} value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input w-full" required aria-label="Start date" />
          <input type={allDay ? 'date' : 'datetime-local'} value={endAt} onChange={(e) => setEndAt(e.target.value)} className="input w-full" aria-label="End date" />
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="input w-full" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Color:</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn text-sm">Cancel</button>
          <button type="submit" disabled={createEvent.isPending} className="btn btn-primary text-sm">
            {createEvent.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent & { event_invites: EventInvite[] }; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const deleteEvent = useDeleteEvent();
  const rsvp = useRsvp();

  async function handleRsvp(status: RsvpStatus) {
    if (!userId) return;
    await rsvp.mutateAsync({ eventId: event.id, userId, status });
  }

  async function handleDelete() {
    await deleteEvent.mutateAsync(event.id);
    onClose();
  }

  const myInvite = event.event_invites?.find((i) => i.user_id === userId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-label="Event details">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-lg font-bold" style={{ color: event.color ?? undefined }}>{event.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">&times;</button>
        </div>
        {event.description && <p className="mb-2 text-sm text-slate-500">{event.description}</p>}
        <div className="mb-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <p>
            {event.all_day
              ? `All day - ${new Date(event.start_at).toLocaleDateString()}`
              : `${formatTime(event.start_at)}${event.end_at ? ` - ${formatTime(event.end_at)}` : ''}`}
          </p>
          {event.location && <p>Location: {event.location}</p>}
          {event.recurrence_rule && <p>Repeats: {event.recurrence_rule}</p>}
        </div>

        {/* RSVP */}
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Your RSVP:</p>
          <div className="flex gap-1">
            {(['accepted', 'maybe', 'declined'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleRsvp(s)}
                disabled={rsvp.isPending}
                className={`rounded px-3 py-1 text-xs capitalize ${myInvite?.status === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Attendees */}
        {event.event_invites?.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-slate-500">Attendees:</p>
            <div className="space-y-1">
              {event.event_invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span>{inv.user?.display_name ?? 'User'}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${inv.status === 'accepted' ? 'bg-green-100 text-green-700' : inv.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {event.created_by === userId && (
            <button type="button" onClick={handleDelete} disabled={deleteEvent.isPending} className="btn text-sm text-red-600 hover:text-red-700">
              Delete
            </button>
          )}
          <button type="button" onClick={onClose} className="btn text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
