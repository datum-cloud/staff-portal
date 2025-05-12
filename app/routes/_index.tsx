import type { Route } from './+types/_index';
import dbLogo from '/images/database.svg';
import { Input } from '@/components/input';
import { getPublic } from '@/utils/.client/public';
import { getCommon } from '@/utils/.common/common';
import { getSecret } from '@/utils/.server/secret';
import { getEnv } from '@/utils/env.server';
import React, { useState } from 'react';
import { useRevalidator } from 'react-router';

export function loader() {
  console.log(getSecret(), getCommon());
  return {
    env: getEnv(),
  };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  console.log(getPublic(), getCommon());
  return {
    ...(await serverLoader()),
  };
}

clientLoader.hydrate = true;

export default function Index({ loaderData: data }: Route.ComponentProps) {
  const [value, setValue] = useState('');
  console.log('dbLogo', dbLogo);
  console.log('value', value);
  const { revalidate } = useRevalidator();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <button type="button" onClick={revalidate} className="flex items-center gap-2">
        <img src={dbLogo} alt="Database" />
        Revalidate
      </button>
      <input />
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="mt-8 w-full max-w-4xl overflow-x-auto">
        <table className="w-full border-collapse rounded-lg bg-gray-100 shadow-md">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {Object.entries(data.env).map(([key, value]) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                  {key}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                  {value ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
