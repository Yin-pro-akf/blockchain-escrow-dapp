"use client";

import { useRef, useState } from "react";
import { BaseError, erc20Abi, parseAbi } from "viem";
import type { Hash } from "viem";
import { useAccount, useBlock, useBlockNumber, useConfig, useWriteContract } from "wagmi";
import { getAccount, readContract } from "wagmi/actions";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useSelectedNetwork,
  useTransactor,
} from "~~/hooks/scaffold-eth";
import { ORDER_STATUS } from "~~/hooks/useOrderRole";

export type OrderActionsProps = {
  /** The on-chain order id, e.g. <OrderActions id={0n} />. */
  id: bigint;
  /** Called after an order-changing transaction has been confirmed. */
  onSuccess?: (hash: Hash) => void;
};

type Action = "deposit" | "confirm" | "markShipped" | "refund";
const shippingAbi = parseAbi(["function markShipped(uint256 id)"]);

export function OrderActions({ id, onSuccess }: OrderActionsProps) {
  const { address, chainId } = useAccount();
  const config = useConfig();
  const network = useSelectedNetwork();
  const { data: escrow } = useDeployedContractInfo({ contractName: "Escrow" });
  const {
    data: order,
    refetch,
    isLoading,
    error: readError,
  } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "getOrder",
    args: [id],
  });
  const { writeContractAsync: writeEscrow } = useScaffoldWriteContract({ contractName: "Escrow" });
  const { writeContractAsync } = useWriteContract();
  const transact = useTransactor();
  const [pending, setPending] = useState<Action>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const isBuyer = !!address && address.toLowerCase() === order?.buyer.toLowerCase();
  const isSeller = !!address && address.toLowerCase() === order?.seller.toLowerCase();
  const wrongNetwork = !!address && chainId !== network.id;
  const supportsShipping = escrow?.abi.some(item => item.type === "function" && String(item.name) === "markShipped");
  const isPaid = order?.status === ORDER_STATUS.Paid;
  const canPay = isBuyer && order?.status === ORDER_STATUS.Created;
  const canShip = isSeller && isPaid && supportsShipping;
  const canConfirm = isBuyer && order?.status === (supportsShipping ? ORDER_STATUS.Shipped : ORDER_STATUS.Paid);
  const { data: blockNumber } = useBlockNumber({
    chainId: network.id,
    watch: isBuyer && isPaid,
    query: { enabled: isBuyer && isPaid },
  });
  const { data: block } = useBlock({
    chainId: network.id,
    blockNumber,
    query: { enabled: isBuyer && isPaid && blockNumber !== undefined },
  });
  const canRefund = isBuyer && isPaid && !!order && !!block && block.timestamp > order.deadline;
  const disabled = pending !== undefined || wrongNetwork || !escrow;

  const handleAction = async (action: Action) => {
    if (submitting.current || !address || !order || !escrow || wrongNetwork) return;
    const permitted = { deposit: canPay, confirm: canConfirm, markShipped: canShip, refund: canRefund }[action];
    if (!permitted) return;

    submitting.current = true;
    setPending(action);
    setError("");
    setMessage("");
    let confirmedHash: Hash | undefined;
    let approvalConfirmed = false;
    try {
      if (action === "deposit") {
        const balance = await readContract(config, {
          address: order.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
          chainId: network.id,
        });
        if (balance < order.amount) {
          throw new Error(`当前买家在 ${network.name} 的订单代币余额不足，请先获取该订单使用的代币。`);
        }
        setMessage("第 1/2 步：请在钱包中授权，等待授权交易确认…");
        // Authorize the token stored in this order, not a hardcoded token address.
        // useTransactor resolves only after a successful transaction receipt.
        const approvalHash = await transact(
          () =>
            writeContractAsync({
              address: order.token,
              abi: erc20Abi,
              functionName: "approve",
              args: [escrow.address, order.amount],
              chainId: network.id,
              account: address,
            }),
          { blockConfirmations: 1 },
        );
        if (!approvalHash) throw new Error("授权交易未发送，付款已停止。");
        approvalConfirmed = true;

        // Recheck after the approval wait: a user may have changed accounts/networks.
        const currentAccount = getAccount(config);
        if (currentAccount.address?.toLowerCase() !== address.toLowerCase() || currentAccount.chainId !== network.id) {
          throw new Error("授权已确认，但钱包账户或网络发生变化。请切回原账户和网络后重新付款。");
        }
        setMessage("第 2/2 步：授权已确认，请在钱包中确认付款…");
        confirmedHash = await writeEscrow({ functionName: "deposit", args: [id] }, { blockConfirmations: 1 });
      } else if (action === "markShipped") {
        setMessage("请在钱包中确认发货，等待交易确认…");
        confirmedHash = await transact(
          () =>
            writeContractAsync({
              address: escrow.address,
              abi: shippingAbi,
              functionName: "markShipped",
              args: [id],
              chainId: network.id,
              account: address,
            }),
          { blockConfirmations: 1 },
        );
      } else {
        setMessage("请在钱包中签名，等待交易确认…");
        confirmedHash = await writeEscrow({ functionName: action, args: [id] }, { blockConfirmations: 1 });
      }
      if (!confirmedHash) throw new Error("交易未发送，请检查钱包连接和网络后重试。");
      setMessage(`操作已确认。交易：${confirmedHash}`);
    } catch (cause) {
      setMessage("");
      const detail =
        cause instanceof BaseError ? cause.shortMessage : cause instanceof Error ? cause.message : "操作失败，请重试。";
      setError(approvalConfirmed ? `${detail} 授权已成功，订单仍需完成付款。` : detail);
    } finally {
      // Refresh even after a failure in case another participant changed the order.
      await refetch().catch(() => undefined);
      submitting.current = false;
      setPending(undefined);
    }
    if (confirmedHash) onSuccess?.(confirmedHash);
  };

  if (isLoading)
    return (
      <p role="status" className="text-sm">
        正在加载订单操作…
      </p>
    );
  if (readError || !order)
    return (
      <p role="alert" className="text-error">
        无法读取订单，请检查订单编号和网络。
      </p>
    );

  return (
    <div className="flex flex-col gap-2" aria-label={`订单 ${id.toString()} 操作`}>
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={disabled}
            onClick={() => handleAction("deposit")}
          >
            付款
          </button>
        )}
        {canShip && (
          <button
            type="button"
            className="btn btn-info btn-sm"
            disabled={disabled}
            onClick={() => handleAction("markShipped")}
          >
            标记已发货
          </button>
        )}
        {canConfirm && (
          <button
            type="button"
            className="btn btn-success btn-sm"
            disabled={disabled}
            onClick={() => handleAction("confirm")}
          >
            确认收货
          </button>
        )}
        {canRefund && (
          <button type="button" className="btn btn-warning btn-sm" disabled={disabled} onClick={() => handleAction("refund")}>
            超期退款
          </button>
        )}
      </div>
      {!address && <p className="m-0 text-sm">请连接钱包查看可用操作。</p>}
      {wrongNetwork && <p className="m-0 text-sm text-warning">请将钱包切换到 {network.name}。</p>}
      {address && !canPay && !canShip && !canConfirm && !canRefund && (
        <p className="m-0 text-sm">当前账户暂无可执行操作。</p>
      )}
      {message && (
        <p role="status" aria-live="polite" className="m-0 break-all text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 break-words text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default OrderActions;
