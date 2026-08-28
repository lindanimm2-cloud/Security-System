'use client';

import Link from 'next/link';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PersonalPage() {
  return (
    <PortalLayout>
      <FeatureHub
        title="Personal Security"
        subtitle="Check-ins, journey monitoring, escorts, and community safety."
        features={[
          { title: 'Check-In Timer', description: 'Schedule safety check-ins and trigger alerts if you fail to respond.', status: 'Available', href: '/portal/requests/check-in', action: 'Set up check-in' },
          { title: 'Journey Monitoring', description: 'Track your journey until you arrive safely at your destination.', status: 'Active', href: '/portal/requests/journey', action: 'Start journey' },
          { title: 'Escort Request', description: 'Request a security escort for high-risk travel or a product move.', href: '/portal/requests/escort', action: 'Request escort' },
          { title: 'Wellness Check', description: 'Request welfare verification visits.', href: '/portal/requests/wellness', action: 'Request check' },
          { title: 'Community Alerts', description: 'Receive local incident notifications in your area.', href: '/portal/requests/alerts', action: 'View alerts' },
          { title: 'Safety Tips', description: 'Educational safety content and best practices.', status: 'Available', href: '/portal/requests/tips', action: 'Read tips' },
          { title: 'Live Location Sharing', description: 'Share your GPS position with dispatch and family.', href: '/portal/requests/share-location', action: 'Share location' },
        ]}
      >
        <div className="info-banner">
          <p>
            Fill in time, locations and vehicle or cargo details on each request.{' '}
            <Link href="/portal/requests">View my requests</Link>
            {' · '}
            <Link href="/portal/location">Family tracking</Link>
            {' · '}
            <Link href="/portal/profile">Profile settings</Link>.
          </p>
        </div>
      </FeatureHub>
    </PortalLayout>
  );
}
