/**
 * Returns a human-readable relative time string.
 * e.g. "just now", "3 minutes ago", "2 days ago", "Mar 5"
 */
export function timeAgo(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr  / 24);

    if (diffSec < 30)  return 'just now';
    if (diffSec < 90)  return '1 minute ago';
    if (diffMin < 60)  return `${diffMin} minutes ago`;
    if (diffHr  === 1) return '1 hour ago';
    if (diffHr  < 24)  return `${diffHr} hours ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7)   return `${diffDay} days ago`;
    if (diffDay < 30)  return `${Math.floor(diffDay / 7)} weeks ago`;

    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

/**
 * Full formatted date for tooltips, e.g. "March 20, 2026 at 3:45 PM"
 */
export function fullDate(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
