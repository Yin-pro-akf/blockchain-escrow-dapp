"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import {
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
} from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth";
import { useOrderRole } from "~~/hooks/useOrderRole";
import { OrderActions } from "./OrderActions";
import { DisputePanel } from "./DisputePanel";

// 订单状态枚举（与 Escrow.sol 的 Status 一一对应）
const STATUS_MAP: Record<number, { text: string; badgeClass: string }> = {
  0: { text: "已创建", badgeClass: "badge-info" },
  1: { text: "已付款", badgeClass: "badge-warning" },
  2: { text: "已完成", badgeClass: "badge-success" },
  3: { text: "已退款", badgeClass: "badge-neutral" },
  4: { text: "争议中", badgeClass: "badge-error" },
};

export const OrderList = () => {
  const [orderIds, setOrderIds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 读订单总数 orderCount
  const { data: orderCount, isFetching } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "orderCount",
  });

  // 有新订单事件时触发重新加载列表
  useScaffoldWatchContractEvent({
    contractName: "Escrow",
    eventName: "OrderCreated",
    onLogs: () => setRefreshKey(k => k + 1),
  });

  useEffect(() => {
    if (orderCount === undefined) {
      return;
    }
    const count = Number(orderCount);
    setOrderIds(Array.from({ length: count }, (_, i) => i));
  }, [orderCount, refreshKey]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold m-0">订单列表</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">订单总数：{isFetching ? "..." : Number(orderCount ?? 0)}</span>
        </div>
      </div>

      {orderIds.length === 0 ? (
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <p className="m-0 text-base-content/70">还没有订单，等买家创建第一笔订单后这里会自动刷新。</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 w-full">
          {orderIds.map(orderId => (
            <OrderCard key={orderId} orderId={orderId} />
          ))}
        </div>
      )}
    </div>
  );
};

// 单笔订单卡片：读 getOrder(id) 并展示所有字段 + 角色 + 操作按钮
const OrderCard = ({ orderId }: { orderId: number }) => {
  const { data: order, isFetching } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "getOrder",
    args: [BigInt(orderId)],
  });

  // 角色判断：按订单的买家/卖家与当前账户对比（useOrderRole）
  const { roleLabel } = useOrderRole({
    buyer: order?.buyer,
    seller: order?.seller,
  });

  if (isFetching && order === undefined) {
    return (
      <div className="card bg-base-100 shadow-xl w-full">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm"></span>
            <span>正在读取订单 #{orderId}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div className="card bg-base-100 shadow-xl w-full">
        <div className="card-body">
          <p className="m-0 text-base-content/70">订单 #{orderId} 读取失败</p>
        </div>
      </div>
    );
  }

  const status = Number(order.status);
  const statusInfo = STATUS_MAP[status] ?? { text: `未知(${status})`, badgeClass: "badge-ghost" };
  const amount = formatEther(order.amount);
  const deadline = new Date(Number(order.deadline) * 1000);

  return (
    <div className="card bg-base-100 shadow-xl w-full">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold m-0">订单 #{String(orderId)}</h3>
          <span className={`badge ${statusInfo.badgeClass}`}>{statusInfo.text}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between items-center gap-2">
            <span className="text-base-content/60">买家</span>
            <Address address={order.buyer} />
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-base-content/60">卖家</span>
            <Address address={order.seller} />
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-base-content/60">代币</span>
            <Address address={order.token} />
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-base-content/60">数量</span>
            <span className="font-mono">{amount} 个</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-base-content/60">截止时间</span>
            <span>{deadline.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-base-content/60">状态值</span>
            <span className="font-mono">{status}</span>
          </div>
        </div>

        <div className="divider m-0"></div>
        <p className="m-0 text-sm text-base-content/80">
          <span className="text-base-content/60">描述：</span>
          {order.description || "（无）"}
        </p>

        <div className="divider m-0"></div>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm text-base-content/60">当前角色：{roleLabel}</p>
          <div className="flex flex-wrap items-center gap-3">
            <OrderActions id={BigInt(orderId)} />
            <DisputePanel orderId={orderId} buyer={order.buyer} seller={order.seller} status={order.status} />
          </div>
        </div>
      </div>
    </div>
  );
};
