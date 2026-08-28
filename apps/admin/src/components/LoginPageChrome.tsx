'use client';

import Link from 'next/link';
import { SketchIcon } from './icons/SketchIcon';
import { ThemeToggle } from './ThemeToggle';

export function LoginPageChrome() {
  return (
    <>
      <Link href="/" className="login-back-website">
        <SketchIcon name="arrow-left" size={16} />
        Back to website
      </Link>
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
    </>
  );
}
