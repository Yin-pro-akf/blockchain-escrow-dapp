"use client";

import { useState } from "react";
import { ORDER_STATUS, useOrderRole, type OrderParties } from "~~/hooks/useOrderRole";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

type DisputePanelProps = OrderParties & {
  orderId: bigint | number;
  /** getOrder 返回的 status，0 Created … 4 Disputed。 */
  status: number | bigint;
};

/**
 * 订单行上的争议和仲裁按钮。
 * 争议：买家或卖家，且状态为 Paid。
 * 仲裁：当前账户等于合约 arbiter，且状态为 Disputed。
 *
 * 页面顶部的角色提示用同目录钩子：
 * const { roleLabel } = useOrderRole({ buyer, seller });
 */
export const DisputePanel = ({ orderId, buyer, seller, status }: DisputePanelProps) => {
  const { isBuyer, isSeller, isArbiter, roleLabel } = useOrderRole({ buyer, seller });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "Escrow" });
  const [pending, setPending] = useState<"dispute" | "seller" | "buyer" | null>(null);

  const statusNumber = Number(status);
  const canDispute = (isBuyer || isSeller) && statusNumber === ORDER_STATUS.Paid;
  const canResolve = isArbiter && statusNumber === ORDER_STATUS.Disputed;
  const busy = pending !== null || isMining;

  const send = async (action: "dispute" | "seller" | "buyer", sellerWins?: boolean) => {
    if (busy) return;
    setPending(action);
    try {
      if (action === "dispute") {
        await writeContractAsync({
          functionName: "dispute",
          args: [BigInt(orderId)],
        });
      } else {
        await writeContractAsync({
          functionName: "resolve",
          args: [BigInt(orderId), Boolean(sellerWins)],
        });
      }
    } catch {
      // useScaffoldWriteContract 会弹出失败通知，这里只结束按钮的等待状态。
    } finally {
      setPending(null);
    }
  };

  if (!canDispute && !canResolve) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm opacity-70">当前角色：{roleLabel}</span>
      <div className="flex flex-wrap gap-2">
        {canDispute && (
          <button className="btn btn-warning btn-sm" disabled={busy} onClick={() => send("dispute")}>
            {pending === "dispute" ? "提交中…" : "争议"}
          </button>
        )}
        {canResolve && (
          <>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => send("seller", true)}>
              {pending === "seller" ? "提交中…" : "判给卖家"}
            </button>
            <button className="btn btn-error btn-sm" disabled={busy} onClick={() => send("buyer", false)}>
              {pending === "buyer" ? "提交中…" : "退给买家"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
