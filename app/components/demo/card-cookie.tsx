'use client';

import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Label } from '@datum-cloud/datum-ui/label';
import { Switch } from '@datum-cloud/datum-ui/switch';

export function CardsCookieSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cookie Settings</CardTitle>
        <CardDescription>Manage your cookie settings here.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="necessary" className="flex flex-col items-start">
            <span>Strictly Necessary</span>
            <span className="text-muted-foreground leading-snug font-normal">
              These cookies are essential in order to use the website and use its features.
            </span>
          </Label>
          <Switch id="necessary" defaultChecked aria-label="Necessary" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="functional" className="flex flex-col items-start">
            <span>Functional Cookies</span>
            <span className="text-muted-foreground leading-snug font-normal">
              These cookies allow the website to provide personalized functionality.
            </span>
          </Label>
          <Switch id="functional" aria-label="Functional" />
        </div>
      </CardContent>
      <CardFooter>
        <Button theme="outline" className="w-full">
          Save preferences
        </Button>
      </CardFooter>
    </Card>
  );
}
