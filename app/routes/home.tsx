import type { Route } from './+types/home';
import { Welcome } from '@/components/welcome';
import React from 'react';

export function meta({}: Route.MetaFunction) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.appVersion };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}
