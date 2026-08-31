import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// StarIcon: renders filled/empty stars based on rating
function StarIcon({ filled }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-slate-200'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
    </svg>
  );
}

// ReviewCard: A single review card displayed in the marquee
function ReviewCard({ review }) {
  return (
    <div className="flex-shrink-0 w-72 sm:w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mx-3 select-none">
      {/* Stars */}
      <div className="flex gap-0.5 mb-3" aria-label={`${review.rating} ดาว`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} filled={star <= review.rating} />
        ))}
      </div>
      {/* Comment */}
      <p className="text-sm text-slate-700 leading-relaxed line-clamp-3 mb-4">
        "{review.comment}"
      </p>
      {/* Reviewer */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {review.reviewer.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-slate-600 truncate">
          {review.reviewer}
        </span>
        <span className="ml-auto shrink-0">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

// Skeleton card while loading
function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-72 sm:w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mx-3">
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 bg-slate-100 rounded" />)}
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-4/5" />
        <div className="h-3 bg-slate-100 rounded w-3/5" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100" />
        <div className="h-3 bg-slate-100 rounded w-24" />
      </div>
    </div>
  );
}

export default function ReviewMarquee() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeaturedReviews() {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_featured_feedbacks');

        if (cancelled) return;

        if (rpcError) {
          console.error('[ReviewMarquee] RPC error:', rpcError.message);
          setError(true);
        } else {
          setReviews(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ReviewMarquee] Fetch failed:', err);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFeaturedReviews();
    return () => { cancelled = true; };
  }, []);

  // If no reviews and not loading, render nothing to avoid empty space
  if (!loading && (error || reviews.length === 0)) return null;

  // While loading, show skeleton cards
  if (loading) {
    return (
      <div className="w-full py-4 overflow-hidden">
        <div className="flex">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Duplicate the array so the marquee loops seamlessly (we slide -50%)
  const doubled = [...reviews, ...reviews];

  return (
    <section
      className="w-full py-4 overflow-hidden relative"
      aria-label="รีวิวจากผู้ใช้งาน Auto Script"
    >
      {/* Fade edges: gradient masks to soften start/end of the scroll */}
      <div
        className="absolute left-0 top-0 h-full w-16 sm:w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgb(248 250 252), transparent)' }}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 h-full w-16 sm:w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgb(248 250 252), transparent)' }}
        aria-hidden="true"
      />

      {/* Marquee track: pauses on hover for accessibility/readability */}
      <div
        className="flex animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]"
        style={{ width: 'max-content' }}
      >
        {doubled.map((review, idx) => (
          // Key must include both index and id since we duplicate the array
          <ReviewCard key={`${idx}-${review.comment?.slice(0, 8)}`} review={review} />
        ))}
      </div>
    </section>
  );
}
