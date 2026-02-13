'use client';

import { useState } from 'react';
import { useTrips, useCreateTrip, useUpdateTrip, useAddItineraryItem, useDeleteItineraryItem } from '@/hooks/use-trips';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';
import type { Trip, TripItineraryItem, TripStatus } from '@/types';

const STATUS_COLORS: Record<TripStatus, string> = {
  planning: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-700',
};

/**
 * Trip planning page with itinerary management.
 */
export default function TripsPage() {
  const { data: trips = [], isLoading } = useTrips();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  const activeTrip = trips.find((t) => t.id === selectedTrip);

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
        <button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
          Plan Trip
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading trips...</p>}

      {/* Trip list */}
      <div className="mb-6 space-y-3">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className={`cursor-pointer rounded-lg border p-4 transition-colors ${selectedTrip === trip.id ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
            onClick={() => setSelectedTrip(selectedTrip === trip.id ? null : trip.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedTrip(selectedTrip === trip.id ? null : trip.id); }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{trip.title}</h3>
                {trip.destination && <p className="text-sm text-slate-500">{trip.destination}</p>}
                {trip.description && <p className="mt-1 text-sm text-slate-400">{trip.description}</p>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[trip.status as TripStatus] ?? STATUS_COLORS.planning}`}>
                {trip.status.replace('_', ' ')}
              </span>
            </div>
            {(trip.start_date || trip.end_date) && (
              <p className="mt-2 text-xs text-slate-400">
                {trip.start_date && new Date(trip.start_date).toLocaleDateString()}
                {trip.start_date && trip.end_date && ' \u2013 '}
                {trip.end_date && new Date(trip.end_date).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
        {!isLoading && trips.length === 0 && (
          <p className="text-center text-sm text-slate-500">No trips planned yet. Start planning your next adventure!</p>
        )}
      </div>

      {/* Trip detail with itinerary */}
      {activeTrip && <TripDetail trip={activeTrip as Trip & { trip_itinerary_items: TripItineraryItem[] }} />}

      {/* Create trip modal */}
      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function TripDetail({ trip }: { trip: Trip & { trip_itinerary_items: TripItineraryItem[] } }) {
  const userId = useAuthStore((s) => s.user?.id);
  const updateTrip = useUpdateTrip();
  const addItem = useAddItineraryItem();
  const deleteItem = useDeleteItineraryItem();
  const [showAddItem, setShowAddItem] = useState(false);
  const [activity, setActivity] = useState('');
  const [dayNumber, setDayNumber] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const items = trip.trip_itinerary_items ?? [];
  const dayGroups = items.reduce<Record<number, TripItineraryItem[]>>((acc, item) => {
    if (!acc[item.day_number]) acc[item.day_number] = [];
    acc[item.day_number].push(item);
    return acc;
  }, {});

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !activity) return;
    await addItem.mutateAsync({
      trip_id: trip.id,
      day_number: dayNumber,
      activity,
      start_time: startTime || null,
      location: location || null,
      notes: notes || null,
      sort_order: (dayGroups[dayNumber]?.length ?? 0) + 1,
      created_by: userId,
    });
    setActivity('');
    setStartTime('');
    setLocation('');
    setNotes('');
    setShowAddItem(false);
  }

  async function handleStatusChange(status: TripStatus) {
    await updateTrip.mutateAsync({ id: trip.id, status });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{trip.title} - Itinerary</h2>
        <div className="flex gap-1">
          {(['planning', 'confirmed', 'in_progress', 'completed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              disabled={updateTrip.isPending}
              className={`rounded px-2 py-1 text-xs capitalize ${trip.status === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(dayGroups)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, dayItems]) => (
          <div key={day} className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-slate-500">Day {day}</h3>
            <div className="space-y-2">
              {dayItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <div>
                    <div className="font-medium">{item.activity}</div>
                    <div className="text-xs text-slate-400">
                      {item.start_time && <span>{item.start_time}</span>}
                      {item.location && <span> - {item.location}</span>}
                    </div>
                    {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteItem.mutate(item.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                    aria-label={`Delete ${item.activity}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

      {items.length === 0 && <p className="mb-4 text-sm text-slate-400">No itinerary items yet.</p>}

      {showAddItem ? (
        <form onSubmit={handleAddItem} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex gap-2">
            <input type="number" value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))} min={1} className="input w-20" aria-label="Day number" />
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input w-32" aria-label="Start time" />
          </div>
          <input type="text" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Activity" className="input w-full" required />
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="input w-full" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input w-full" rows={2} />
          <div className="flex gap-2">
            <button type="submit" disabled={addItem.isPending} className="btn btn-primary text-sm">Add</button>
            <button type="button" onClick={() => setShowAddItem(false)} className="btn text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowAddItem(true)} className="btn text-sm">
          + Add Itinerary Item
        </button>
      )}
    </div>
  );
}

function CreateTripModal({ onClose }: { onClose: () => void }) {
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const userId = useAuthStore((s) => s.user?.id);
  const createTrip = useCreateTrip();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !title) return;
    await createTrip.mutateAsync({
      family_id: familyId,
      title,
      destination: destination || null,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'planning',
      created_by: userId,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-label="Plan a trip">
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <h2 className="mb-4 text-lg font-bold">Plan a Trip</h2>
        <div className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Trip name" className="input w-full" required />
          <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="input w-full" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="input w-full" rows={2} />
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input flex-1" aria-label="Start date" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input flex-1" aria-label="End date" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn text-sm">Cancel</button>
          <button type="submit" disabled={createTrip.isPending} className="btn btn-primary text-sm">
            {createTrip.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}
