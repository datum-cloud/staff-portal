import { Button } from '@/modules/shadcn/ui/button';

const AuthError = ({ message }: { message: string }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-2xl dark:bg-gray-800">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            Oops! Something went wrong
          </h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">{message}</p>

          <Button onClick={() => (window.location.href = '/logout')}>Login</Button>
        </div>
      </div>
    </div>
  );
};

export default AuthError;
