import type { Route } from './+types/dashboard';
import { CardsCreateAccount } from '@/components/demo/card-account';
import { CardsActivityGoal } from '@/components/demo/card-activity';
import { CardsCalendar } from '@/components/demo/card-calendar';
import { CardsChat } from '@/components/demo/card-chat';
import { CardsCookieSettings } from '@/components/demo/card-cookie';
import { CardsExerciseMinutes } from '@/components/demo/card-exercise';
import { CardsForms } from '@/components/demo/card-form';
import { CardsPayments } from '@/components/demo/card-payment';
import { CardsReportIssue } from '@/components/demo/card-report';
import { CardsShare } from '@/components/demo/card-share';
import { CardsStats } from '@/components/demo/card-stats';
import { CardsTeamMembers } from '@/components/demo/card-team';
import { Button } from '@/modules/shadcn/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import { metaObject } from '@/utils/helpers';
import { Theme, useTheme } from 'remix-themes';

export const meta: Route.MetaFunction = () => {
  return metaObject('Demo');
};

export default function Demo() {
  const [, setTheme] = useTheme();

  return (
    <div className="md:grids-col-2 grid p-4 **:data-[slot=card]:shadow-none md:gap-4 lg:grid-cols-10 xl:grid-cols-11">
      <div className="grid gap-4 lg:col-span-4 xl:col-span-6">
        <CardsStats />
        <div className="grid gap-1 sm:grid-cols-[auto_1fr] md:hidden">
          <CardsCalendar />

          <div className="pt-3 sm:pt-0 sm:pl-2 xl:pl-4">
            <CardsActivityGoal />
          </div>
          <div className="pt-3 sm:col-span-2 xl:pt-4">
            <CardsExerciseMinutes />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <CardsForms />
            <CardsTeamMembers />
            <CardsCookieSettings />
          </div>
          <div className="flex flex-col gap-4">
            <CardsCreateAccount />
            <CardsChat />
            <div className="hidden xl:block">
              <CardsReportIssue />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 lg:col-span-6 xl:col-span-5">
        <div className="hidden gap-1 sm:grid-cols-[auto_1fr] md:grid">
          <CardsCalendar />
          <div className="pt-3 sm:pt-0 sm:pl-2 xl:pl-3">
            <CardsActivityGoal />
          </div>
          <div className="pt-3 sm:col-span-2 xl:pt-3">
            <CardsExerciseMinutes />
          </div>
          <div className="pt-3 sm:col-span-2 xl:pt-3">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Change the theme of the app.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setTheme(Theme.LIGHT)}>Light</Button>
                &nbsp;
                <Button onClick={() => setTheme(Theme.DARK)}>Dark</Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="hidden md:block">
          <CardsPayments />
        </div>
        <CardsShare />
        <div className="xl:hidden">
          <CardsReportIssue />
        </div>
      </div>
    </div>
  );
}
