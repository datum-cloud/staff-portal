import { useLingui } from '@lingui/react/macro';
import React from 'react';

export function Welcome({ message }: { message: string }) {
  const { t } = useLingui();

  return (
    <main className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t`App Version:`} {message}
          </h1>
          <div className="w-[250px] p-4">
            <img src="/images/logo.png" alt="Datum - Staff Portal" className="block w-full" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t`Welcome to Datum - Staff Portal`}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{t`Simplifying cloud operations`}</p>
          </div>
        </header>
      </div>
    </main>
  );
}
