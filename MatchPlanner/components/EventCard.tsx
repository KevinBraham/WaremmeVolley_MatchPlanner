import Link from 'next/link';
import { formatDateFrench } from '@/lib/utils/date';
import { getEventStatusColor, getStatusTextColorClasses } from '@/lib/utils/status-color';
import { StatusBadge } from '@/components/StatusBadge';
import type { EventWithDetails } from '@/lib/types/database';

interface EventCardProps {
  event: EventWithDetails;
}

export function EventCard({ event }: EventCardProps) {
  const statusColor = getEventStatusColor(event);
  
  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className="card h-full hover:shadow-medium transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge color={statusColor} size="lg" />
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${getStatusTextColorClasses(statusColor)}`}>
                {statusColor === 'red' ? 'Urgent' : statusColor === 'orange' ? 'Attention' : 'À jour'}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {formatDateFrench(event.event_date)}
              </span>
            </div>
            <h3 className="font-semibold text-lg text-secondary mb-1 line-clamp-2">
              {event.name}
            </h3>
            {event.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="inline-flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {event.team.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

