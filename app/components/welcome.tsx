import { Button } from '@/modules/shadcn/ui/button';
import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router';
import { Theme, useTheme } from 'remix-themes';

export function Welcome({ message }: { message: string }) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [, setTheme] = useTheme();

  return (
    <main className="flex h-screen items-center justify-center bg-amber-200">
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
            <Button onClick={() => navigate('/logout')}>{t`Logout`}</Button>
            <Button onClick={() => setTheme(Theme.LIGHT)}>Light</Button>
            <Button onClick={() => setTheme(Theme.DARK)}>Dark</Button>
          </div>

          <div style={{ '--sidebar-test': '100px' } as React.CSSProperties}>
            <div className="w-[var(--sidebar-test)] bg-amber-300">tet2</div>
          </div>
        </header>
      </div>
    </main>
  );
}
