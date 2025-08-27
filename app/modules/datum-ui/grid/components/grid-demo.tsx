import { Row, Col } from './index';
import React from 'react';

const GridDemo: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <h1 className="mb-6 text-2xl font-bold">Grid System Demo</h1>

      {/* Basic Usage */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Basic Usage</h2>
        <Row gutter={16}>
          <Col span={24}>
            <div className="border bg-blue-100 p-4 text-center">col-24</div>
          </Col>
        </Row>
        <Row gutter={16} className="mt-4">
          <Col span={12}>
            <div className="border bg-blue-100 p-4 text-center">col-12</div>
          </Col>
          <Col span={12}>
            <div className="border bg-blue-100 p-4 text-center">col-12</div>
          </Col>
        </Row>
        <Row gutter={16} className="mt-4">
          <Col span={8}>
            <div className="border bg-blue-100 p-4 text-center">col-8</div>
          </Col>
          <Col span={8}>
            <div className="border bg-blue-100 p-4 text-center">col-8</div>
          </Col>
          <Col span={8}>
            <div className="border bg-blue-100 p-4 text-center">col-8</div>
          </Col>
        </Row>
      </section>

      {/* Responsive */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Responsive</h2>
        <Row gutter={{ xs: 8, sm: 16, md: 24 }}>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div className="border bg-green-100 p-4 text-center">Responsive Col</div>
          </Col>
        </Row>
      </section>

      {/* Flex Layout */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Flex Layout</h2>
        <Row type="flex" justify="center" align="middle" className="h-20 bg-gray-100">
          <Col span={6}>
            <div className="border bg-purple-100 p-4 text-center">Centered</div>
          </Col>
          <Col span={6}>
            <div className="border bg-purple-100 p-4 text-center">Centered</div>
          </Col>
        </Row>
        <Row type="flex" justify="space-between" className="mt-4 h-20 bg-gray-100">
          <Col span={6}>
            <div className="border bg-purple-100 p-4 text-center">Space Between</div>
          </Col>
          <Col span={6}>
            <div className="border bg-purple-100 p-4 text-center">Space Between</div>
          </Col>
        </Row>
      </section>

      {/* Offset */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Offset</h2>
        <Row gutter={16}>
          <Col span={8} offset={8}>
            <div className="border bg-yellow-100 p-4 text-center">col-8 offset-8</div>
          </Col>
        </Row>
        <Row gutter={16} className="mt-4">
          <Col span={6} offset={6}>
            <div className="border bg-yellow-100 p-4 text-center">col-6 offset-6</div>
          </Col>
          <Col span={6} offset={6}>
            <div className="border bg-yellow-100 p-4 text-center">col-6 offset-6</div>
          </Col>
        </Row>
      </section>

      {/* Order */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Order</h2>
        <Row type="flex" gutter={16}>
          <Col span={6} order={4}>
            <div className="border bg-red-100 p-4 text-center">Order 4</div>
          </Col>
          <Col span={6} order={3}>
            <div className="border bg-red-100 p-4 text-center">Order 3</div>
          </Col>
          <Col span={6} order={2}>
            <div className="border bg-red-100 p-4 text-center">Order 2</div>
          </Col>
          <Col span={6} order={1}>
            <div className="border bg-red-100 p-4 text-center">Order 1</div>
          </Col>
        </Row>
      </section>

      {/* Push/Pull */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Push/Pull</h2>
        <Row gutter={16}>
          <Col span={8} push={16}>
            <div className="border bg-orange-100 p-4 text-center">col-8 push-16</div>
          </Col>
          <Col span={16} pull={8}>
            <div className="border bg-orange-100 p-4 text-center">col-16 pull-8</div>
          </Col>
        </Row>
      </section>

      {/* Vertical Gutter */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Vertical Gutter</h2>
        <Row gutter={[16, 24]}>
          <Col span={12}>
            <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
          </Col>
          <Col span={12}>
            <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
          </Col>
          <Col span={12}>
            <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
          </Col>
          <Col span={12}>
            <div className="border bg-indigo-100 p-4 text-center">Vertical Gutter</div>
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default GridDemo;
