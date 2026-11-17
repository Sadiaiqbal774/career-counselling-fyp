import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import { readUserProfile, saveUserProfile, getProfileCompletion } from '../data/userData';

/**
 * Hook to fetch and synchronize the user's academic profile across devices.
 * - Immediately returns the cached profile from localStorage for zero-latency display.
 * - Queries Supabase 'profiles' table for the current user's persisted record.
 * - Updates localStorage and component state when remote data arrives, ensuring
 *   cross-device synchronization (e.g., profile completed on laptop reflects on mobile).
 *
 * Returns { profile, profileCompletion, loading }
 */
export default function useUserProfile(currentUser) {
  const [profile, setProfile] = useState(() => readUserProfile(currentUser?.id));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) {
      setProfile({});
      return;
    }

    // 1. Initial cached value
    const cached = readUserProfile(currentUser.id);
    if (cached && Object.keys(cached).length > 0) {
      setProfile(cached);
    } else {
      setLoading(true);
    }

    let cancelled = false;

    // 2. Fetch fresh profile from Supabase
    (async () => {
      try {
        const { data: sp, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, city, academic_level, school, marks, intermediate_marks, intermediate_group, entry_test, entry_test_score, preferred_field, interests, notes, updated_at')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (cancelled) return;

        if (!error && sp) {
          // Reject only if both emails are present and belong to different users
          if (
            sp.email &&
            currentUser.email &&
            sp.email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()
          ) {
            return;
          }

          const resolved = {
            fullName: sp.full_name || currentUser.name || '',
            email: sp.email || currentUser.email || '',
            phone: sp.phone || '',
            city: sp.city || '',
            school: sp.school || '',
            marks: sp.marks !== null && sp.marks !== undefined ? String(sp.marks) : '',
            intermediateMarks: sp.intermediate_marks !== null && sp.intermediate_marks !== undefined ? String(sp.intermediate_marks) : '',
            intermediateGroup: sp.intermediate_group || 'Pre-Engineering',
            entryTest: sp.entry_test || 'None',
            entryTestScore: sp.entry_test_score ? String(sp.entry_test_score) : '',
            academicLevel: ['Matric', 'Intermediate'].includes(sp.academic_level) ? sp.academic_level : 'Intermediate',
            preferredField: sp.preferred_field || 'Technology',
            interests: sp.interests || '',
            notes: sp.notes || '',
          };

          saveUserProfile(currentUser.id, resolved);
          setProfile(resolved);
        }
      } catch (_) {
        // Offline fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.name]);

  const profileCompletion = getProfileCompletion(profile);

  return { profile, profileCompletion, loading };
}
