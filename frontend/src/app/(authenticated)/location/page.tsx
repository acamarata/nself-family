'use client';

import { useState, useCallback } from 'react';
import { useActiveLocations, useGeofences, useShareLocation, useCreateGeofence, useDeleteGeofence } from '@/hooks/use-location';
import { useAuthStore } from '@/lib/auth-store';
import { useFamilyStore } from '@/lib/family-store';

/**
 * Live location sharing page with family member map and geofences.
 */
export default function LocationPage() {
  const { data: locations = [], isLoading: loadingLocations } = useActiveLocations();
  const { data: geofences = [], isLoading: loadingGeofences } = useGeofences();
  const shareLocation = useShareLocation();
  const createGeofence = useCreateGeofence();
  const deleteGeofence = useDeleteGeofence();
  const userId = useAuthStore((s) => s.user?.id);
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const [showGeofenceForm, setShowGeofenceForm] = useState(false);
  const [sharingDuration, setSharingDuration] = useState(1);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'error'>('idle');

  const handleShareLocation = useCallback(async () => {
    if (!userId || !familyId) return;
    setShareStatus('sharing');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      await shareLocation.mutateAsync({
        user_id: userId,
        family_id: familyId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ?? undefined,
        duration_hours: sharingDuration,
      });
      setShareStatus('idle');
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  }, [userId, familyId, sharingDuration, shareLocation]);

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pl-56">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Location Sharing</h1>
        <div className="flex items-center gap-2">
          <select
            value={sharingDuration}
            onChange={(e) => setSharingDuration(Number(e.target.value))}
            className="input text-sm"
            aria-label="Sharing duration"
          >
            <option value={1}>1 hour</option>
            <option value={2}>2 hours</option>
            <option value={4}>4 hours</option>
            <option value={8}>8 hours</option>
            <option value={24}>24 hours</option>
          </select>
          <button
            type="button"
            onClick={handleShareLocation}
            disabled={shareStatus === 'sharing'}
            className="btn btn-primary text-sm"
          >
            {shareStatus === 'sharing' ? 'Getting location...' : shareStatus === 'error' ? 'Failed - Try again' : 'Share My Location'}
          </button>
        </div>
      </div>

      {/* Location map placeholder */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 text-center text-sm text-slate-500">
          Map view requires a map provider integration (Leaflet/Mapbox).
          <br />Family member locations are shown below.
        </div>

        {loadingLocations && <p className="text-center text-sm text-slate-400">Loading locations...</p>}

        {/* Active locations list */}
        <div className="space-y-3">
          {locations.map((loc) => {
            const expiresIn = Math.max(0, Math.round((new Date(loc.expires_at).getTime() - Date.now()) / 60000));
            return (
              <div key={loc.id} className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    {(loc.display_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{loc.display_name ?? 'Unknown'}</div>
                    <div className="text-xs text-slate-400">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      {loc.accuracy != null && ` (\u00b1${Math.round(loc.accuracy)}m)`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">
                    Updated {new Date(loc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`text-xs ${expiresIn < 15 ? 'text-orange-500' : 'text-green-500'}`}>
                    Expires in {expiresIn}m
                  </div>
                </div>
              </div>
            );
          })}
          {!loadingLocations && locations.length === 0 && (
            <p className="text-center text-sm text-slate-400">No family members are currently sharing their location.</p>
          )}
        </div>
      </div>

      {/* Geofences */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Geofences</h2>
        <button type="button" onClick={() => setShowGeofenceForm(!showGeofenceForm)} className="btn text-sm">
          {showGeofenceForm ? 'Cancel' : '+ Add Geofence'}
        </button>
      </div>

      {showGeofenceForm && <GeofenceForm familyId={familyId} userId={userId} onCreated={() => setShowGeofenceForm(false)} />}

      {loadingGeofences && <p className="text-sm text-slate-400">Loading geofences...</p>}

      <div className="space-y-2">
        {geofences.map((fence) => (
          <div key={fence.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div>
              <div className="font-medium">{fence.name}</div>
              <div className="text-xs text-slate-400">
                Center: {fence.center_lat.toFixed(4)}, {fence.center_lng.toFixed(4)} | Radius: {fence.radius_meters}m
              </div>
              <div className="mt-1 flex gap-2 text-xs">
                {fence.alert_on_enter && <span className="rounded bg-green-100 px-1.5 text-green-700">Enter alert</span>}
                {fence.alert_on_exit && <span className="rounded bg-red-100 px-1.5 text-red-700">Exit alert</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => deleteGeofence.mutate(fence.id)}
              className="text-xs text-red-400 hover:text-red-600"
              aria-label={`Delete geofence ${fence.name}`}
            >
              Remove
            </button>
          </div>
        ))}
        {!loadingGeofences && geofences.length === 0 && !showGeofenceForm && (
          <p className="text-sm text-slate-400">No geofences configured. Add one to get alerts when family members arrive or leave.</p>
        )}
      </div>
    </div>
  );
}

function GeofenceForm({ familyId, userId, onCreated }: { familyId: string | null; userId: string | undefined; onCreated: () => void }) {
  const createGeofence = useCreateGeofence();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('200');
  const [alertEnter, setAlertEnter] = useState(true);
  const [alertExit, setAlertExit] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !userId || !name || !lat || !lng) return;
    await createGeofence.mutateAsync({
      family_id: familyId,
      name,
      center_lat: parseFloat(lat),
      center_lng: parseFloat(lng),
      radius_meters: parseInt(radius, 10),
      alert_on_enter: alertEnter,
      alert_on_exit: alertExit,
      monitored_user_ids: [],
      created_by: userId,
    });
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Geofence name (e.g., Home, School)" className="input w-full" required />
      <div className="flex gap-2">
        <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" className="input flex-1" required aria-label="Latitude" />
        <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" className="input flex-1" required aria-label="Longitude" />
      </div>
      <input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="Radius (meters)" className="input w-full" min={10} required aria-label="Radius in meters" />
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={alertEnter} onChange={(e) => setAlertEnter(e.target.checked)} /> Alert on enter
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={alertExit} onChange={(e) => setAlertExit(e.target.checked)} /> Alert on exit
        </label>
      </div>
      <button type="submit" disabled={createGeofence.isPending} className="btn btn-primary text-sm">
        {createGeofence.isPending ? 'Creating...' : 'Create Geofence'}
      </button>
    </form>
  );
}
