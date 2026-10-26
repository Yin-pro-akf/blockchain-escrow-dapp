"use client";

import type { NextPage } from "next";
import { CreateOrder } from "./_components/CreateOrder";
import { OrderList } from "./_components/OrderList";

const Escrow: NextPage = () => {
  return (
    <div className="flex flex-col items-center grow pt-8 px-5">
      <h1 className="text-3xl font-bold mb-6">托管交易</h1>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        {/* 刘：创建订单 */}
        <CreateOrder />
        {/* 雯青：订单列表与读数据（内部集成刘的付款/确认和林的角色判断/争议仲裁） */}
        <OrderList />
      </div>
    </div>
  );
};

export default Escrow;
