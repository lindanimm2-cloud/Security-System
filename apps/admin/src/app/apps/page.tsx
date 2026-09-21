import type { Metadata } from 'next';
import GetTheAppClient from './GetTheAppClient';

export const metadata: Metadata = {
  title: 'Get the 4DS app',
  description:
    'Download and install 4DS for compatible phones, tablets, watches, and the Control Panel.',
};

export default function AppsPage() {
  return <GetTheAppClient />;
}
