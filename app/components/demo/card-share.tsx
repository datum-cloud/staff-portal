'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Input } from '@datum-cloud/datum-ui/input';
import { Label } from '@datum-cloud/datum-ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Separator } from '@datum-cloud/datum-ui/separator';

const people = [
  {
    name: 'Olivia Martin',
    email: 'm@example.com',
    avatar: '/avatars/03.png',
  },
  {
    name: 'Isabella Nguyen',
    email: 'b@example.com',
    avatar: '/avatars/04.png',
  },
  {
    name: 'Sofia Davis',
    email: 'p@example.com',
    avatar: '/avatars/05.png',
  },
  {
    name: 'Ethan Thompson',
    email: 'e@example.com',
    avatar: '/avatars/01.png',
  },
];
export function CardsShare() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Share this document</CardTitle>
        <CardDescription>Anyone with the link can view this document.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Label htmlFor="link" className="sr-only">
            Link
          </Label>
          <Input id="link" value="http://example.com/link/to/document" className="h-8" readOnly />
          <Button size="small" theme="outline" className="shadow-none">
            Copy Link
          </Button>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium">People with access</div>
          <div className="grid gap-6">
            {people.map((person) => (
              <div key={person.email} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={person.avatar} alt="Image" />
                    <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm leading-none font-medium">{person.name}</p>
                    <p className="text-muted-foreground text-sm">{person.email}</p>
                  </div>
                </div>
                <Select defaultValue="edit">
                  <SelectTrigger className="ml-auto h-8 pr-2 text-sm" aria-label="Edit">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="edit">Can edit</SelectItem>
                    <SelectItem value="view">Can view</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
