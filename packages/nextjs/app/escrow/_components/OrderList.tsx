"use client";
import { OrderTokenAmount } from "./OrderTokenAmount";
import { useReceiptTimeline } from "./useReceiptTimeline";
import { ReceiptTimelinePanel } from "./ReceiptTimelinePanel";


import { useMemo, useState } from "react";
import {
  useScaffoldReadContract,
  } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth";
import { useOrderRole } from "~~/hooks/useOrderRole";
import { OrderActions } from "./OrderActions";
import { DisputePanel } from "./DisputePanel";

const STATUS_MAP: Record<number, { text: string; badgeClass: string }> = {
  0: { text: "已创建", badgeClass: "badge-info" },
  1: { text: "已付款", badgeClass: "badge-warning" },
  2: { text: "已完成", badgeClass: "badge-success" },
  3: { text: "已退款", badgeClass: "badge-neutral" },
  4: { text: "争议中", badgeClass: "badge-error" },
};

type OrderEventItem = {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  id: bigint;
};

export const OrderList = () => {
  const receiptTimeline = useReceiptTimeline();
  const allEvents = receiptTimeline.events;

  const { data: orderCount, isFetching } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "orderCount",
  });

  const orderIds = useMemo(() => {
    if (orderCount === undefined) return [];
    return Array.from({ length: Number(orderCount) }, (_, i) => i);
  }, [orderCount]);

  return (
    <div className="flex flex-col gap-4 w-full">

      <ReceiptTimelinePanel timeline={receiptTimeline} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold m-0">订单列表</h2>

        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">
            订单总数：
            {isFetching && orderCount === undefined
              ? "..."
              : Number(orderCount ?? 0)}
          </span>
        </div>
      </div>

      {orderCount === undefined && isFetching ? (
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <span className="loading loading-spinner"></span>
              <span>正在读取订单列表...</span>
            </div>
          </div>
        </div>
      ) : orderCount === undefined ? (
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <p className="m-0 text-error">
              订单总数读取失败，请检查钱包网络和合约部署配置。
            </p>
          </div>
        </div>
      ) : orderIds.length === 0 ? (
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <p className="m-0 text-base-content/70">
              还没有订单，等买家创建第一笔订单后这里会自动刷新。
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 w-full">
          {orderIds.map(orderId => (
            <OrderCard
              key={orderId}
              orderId={orderId}
              allEvents={allEvents}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const OrderCard = ({
  orderId,
  allEvents,
}: {
  orderId: number;
  allEvents: OrderEventItem[];
}) => {
  const [expandTimeline, setExpandTimeline] = useState(false);
  const bigOrderId = BigInt(orderId);

  const timelineEvents = allEvents.filter(event => event.id === bigOrderId);

  const { data: order, isFetching } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "getOrder",
    args: [bigOrderId],
  });

  const { roleLabel } = useOrderRole({
    buyer: order?.buyer,
    seller: order?.seller,
  });

  if (isFetching && order === undefined) {
    return (
      <div className="card bg-base-100 shadow-xl w-full">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <span className="loading loading-spinner"></span>
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
          <p className="m-0 text-base-content/70">
            订单 #{orderId} 读取失败
          </p>
        </div>
      </div>
    );
  }

  const status = Number(order.status);
  const statusInfo = STATUS_MAP[status] ?? {
    text: `未知(${status})`,
    badgeClass: "badge-ghost",
  };

  
  const deadline = new Date(Number(order.deadline) * 1000);

  return (
    <div className="card bg-base-100 shadow-xl w-full">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold m-0">
            订单 #{orderId}
          </h3>

          <span className={`badge ${statusInfo.badgeClass}`}>
            {statusInfo.text}
          </span>
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
            <span className="text-base-content/60">金额</span>
            <OrderTokenAmount tokenAddress={order.token} value={order.amount} />
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

        <p className="m-0 text-sm">
          <span className="text-base-content/60">描述：</span>
          {order.description || "（无）"}
        </p>

        <div className="divider m-0"></div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm text-base-content/60">
            当前角色：{roleLabel}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <OrderActions id={bigOrderId} />

            <DisputePanel
              orderId={orderId}
              buyer={order.buyer}
              seller={order.seller}
              status={status}
            />

            <button
              type="button"
              className="btn btn-xs"
              onClick={() => setExpandTimeline(previous => !previous)}
            >
              {expandTimeline ? "收起时间线" : "展开事件时间线"}
            </button>
          </div>
        </div>

        {expandTimeline && (
          <>
            <div className="divider m-0"></div>

            <div className="bg-base-200 p-4 rounded-md">
              <div className="font-bold mb-2">
                订单 #{orderId} — 链上事件时间线（按区块升序）
              </div>

              {timelineEvents.length === 0 ? (
                <span className="text-sm text-base-content/60">
                  暂无事件记录，可能仍在加载；若持续为空，请检查事件查询和 RPC。
                </span>
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {timelineEvents.map((event, index) => (
                    <li
                      key={`${event.transactionHash}-${event.eventName}-${index}`}
                    >
                      <strong>{event.eventName}</strong>
                      {" 区块号："}
                      {event.blockNumber.toString()}
                      {" Tx："}

                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://blockscout-testnet.potos.hk/tx/${event.transactionHash}`}
                        className="link link-primary ml-1"
                      >
                        {event.transactionHash.slice(0, 16)}…
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
