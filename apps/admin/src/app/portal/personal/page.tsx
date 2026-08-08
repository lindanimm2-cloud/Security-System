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
          { title: 'Check-In Timer', description: 'Schedule safety check-ins and trigger alerts if you fail to respond.', status: 'Available', href: '/portal/location', action: 'Enable tracking' },
          { title: 'Journey Monitoring', description: 'Track your journey until you arrive safely at your destination.', status: 'Active', href: '/portal/location', action: 'Start journey' },
          { title: 'Escort Request', description: 'Request a security escort for high-risk travel.', href: '/portal/emergency', action: 'Request via emergency hub' },
          { title: 'Wellness Check', description: 'Request welfare verification visits.', href: '/portal/emergency', action: 'Request check' },
          { title: 'Community Alerts', description: 'Receive local incident notifications in your area.', href: '/portal/updates', action: 'View alerts' },
          { title: 'Safety Tips', description: 'Educational safety content and best practices.', status: 'Available', href: '/portal/updates', action: 'Read tips' },
          { title: 'Live Location Sharing', description: 'Share your GPS position with dispatch and family.', href: '/portal/location', action: 'Share location' },
        ]}
      >
        <div className="info-banner">
          <p>Your personal tracking is managed from <Link href="/portal/location">Family Tracking</Link> and <Link href="/portal/profile">Profile settings</Link>.</p>
        </div>
      </FeatureHub>
    </PortalLayout>
  );
}
