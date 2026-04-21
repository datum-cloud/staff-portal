'use client';

import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { ChartConfig, ChartContainer } from '@datum-cloud/datum-ui/chart';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Area, AreaChart, Line, LineChart } from 'recharts';

const data = [
  {
    revenue: 10400,
    subscription: 40,
  },
  {
    revenue: 14405,
    subscription: 90,
  },
  {
    revenue: 9400,
    subscription: 200,
  },
  {
    revenue: 8200,
    subscription: 278,
  },
  {
    revenue: 7000,
    subscription: 89,
  },
  {
    revenue: 9600,
    subscription: 239,
  },
  {
    revenue: 11244,
    subscription: 78,
  },
  {
    revenue: 26475,
    subscription: 89,
  },
];

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--primary)',
  },
  subscription: {
    label: 'Subscriptions',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export function CardsStats() {
  return (
    <Row gutter={[16, 16]}>
      <Col span={24} sm={12} lg={24} xl={12}>
        <Card>
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">$15,231.89</CardTitle>
            <CardDescription>+20.1% from last month</CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer config={chartConfig} className="min-h-[80px] w-full">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}>
                <Line
                  type="monotone"
                  strokeWidth={2}
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </Col>
      <Col span={24} sm={12} lg={24} xl={12}>
        <Card className="pb-0 lg:hidden xl:flex">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardDescription>Subscriptions</CardDescription>
              <CardTitle className="text-3xl">+2,350</CardTitle>
              <CardDescription>+180.1% from last month</CardDescription>
            </div>
            <Button theme="borderless" size="small" className="shrink-0">
              View More
            </Button>
          </CardHeader>
          <CardContent className="mt-auto max-h-[124px] flex-1 p-0">
            <ChartContainer config={chartConfig} className="size-full">
              <AreaChart
                data={data}
                margin={{
                  left: 0,
                  right: 0,
                }}>
                <Area
                  dataKey="subscription"
                  fill="var(--color-subscription)"
                  fillOpacity={0.05}
                  stroke="var(--color-subscription)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </Col>
    </Row>
  );
}
