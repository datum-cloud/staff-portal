import type { Route } from './+types/home';
import { Welcome } from '@/components/welcome';
import React from 'react';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'Datum - Staff Portal' },
    { name: 'description', content: 'Welcome to Datum - Staff Portal' },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.appVersion };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}
